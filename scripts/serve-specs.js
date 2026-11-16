#!/usr/bin/env bun
/**
 * Static server for reviewing spec documents, with reload-on-change.
 * The reload client is injected into the response and never written to disk.
 *   bun scripts/serve-specs.js [dir] [--port N]
 */
import { watch } from "node:fs";
import { resolve, join, extname, relative } from "node:path";

const args = process.argv.slice(2);
const portFlag = args.indexOf("--port");
const root = resolve(args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--port") ?? "docs/specs");
// Derive the default port from the served path so two projects can be reviewed at
// once. A fixed default means the second project silently answers on the first
// project's port, and its URLs return someone else's documents.
const hash = [...root].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 1000, 7);
const port = Number(
  portFlag >= 0 ? args[portFlag + 1] : process.env.SPEC_REVIEW_PORT ?? 4173 + (hash % 400),
);

const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml",
  ".png": "image/png", ".json": "application/json",
};

const RELOAD_CLIENT = `
<script>
(() => {
  const KEY = 'spec-review-scroll:' + location.pathname;
  const saved = sessionStorage.getItem(KEY);
  if (saved) addEventListener('load', () => scrollTo(0, Number(saved)), { once: true });
  addEventListener('scroll', () => sessionStorage.setItem(KEY, String(scrollY)), { passive: true });
  const source = new EventSource('/__spec-reload');
  source.onmessage = () => location.reload();
  // A restarted server may be serving different content, so reload on a new boot id.
  let boot = null;
  source.addEventListener('hello', (e) => {
    if (boot !== null && e.data !== boot) return location.reload();
    boot = e.data;
  });
  // No onerror handler: EventSource reconnects on its own. Reloading here turns
  // every transient disconnect into a page reload.
})();
</script>`;

const clients = new Set();
const BOOT = String(Date.now());   // changes on restart; the client reloads when it does
let timer = null;

// A review server outlives the conversation that started it: sessions end without a
// closing word, and nothing runs afterwards to clean up. So it ends itself once no
// one has been reading for a while, and lingering stops depending on anyone
// remembering. Set SPEC_REVIEW_IDLE_MINUTES=0 to keep it running indefinitely.
const IDLE_MINUTES = Number(process.env.SPEC_REVIEW_IDLE_MINUTES ?? 30);
let lastSeen = Date.now();
if (IDLE_MINUTES > 0) {
  setInterval(() => {
    if (clients.size > 0) return (lastSeen = Date.now());
    const idleMs = Date.now() - lastSeen;
    if (idleMs < IDLE_MINUTES * 60_000) return;
    console.log(`No readers for ${IDLE_MINUTES}m - exiting. Restart with: bun run specs:serve`);
    process.exit(0);
  }, 15_000).unref?.();
}

watch(root, { recursive: true }, (_event, filename) => {
  if (!filename || filename.startsWith(".")) return;
  clearTimeout(timer);
  timer = setTimeout(() => {
    for (const client of clients) client.write("data: reload\n\n");
    console.log(`reload -> ${filename} (${clients.size} client${clients.size === 1 ? "" : "s"})`);
  }, 60);
});

if (args.includes("--print-port")) {
  console.log(port);
  process.exit(0);
}

// Binds the first free port at or above the preferred one, so a second session
// never dies on a busy port and never silently answers on someone else's.
const serve = (handler) => {
  for (let candidate = port; candidate < port + 20; candidate++) {
    try {
      return Bun.serve({ port: candidate, fetch: handler });
    } catch (error) {
      // Bun reports this on error.code; the message text does not contain it.
      if (error?.code !== "EADDRINUSE") throw error;
    }
  }
  throw new Error(`No free port in ${port}-${port + 19}`);
};

const server = serve(async (request) => {
  {
    const url = new URL(request.url);

    // Lets a caller confirm which project this port is serving before trusting a URL.
    if (url.pathname === "/__spec-root") {
      return new Response(root, { headers: { "content-type": "text/plain" } });
    }

    if (url.pathname === "/__spec-reload") {
      return new Response(
        new ReadableStream({
          start(controller) {
            const client = {
              write: (chunk) => controller.enqueue(new TextEncoder().encode(chunk)),
            };
            clients.add(client);
            lastSeen = Date.now();
            client.write(`retry: 1000\nevent: hello\ndata: ${BOOT}\n\n`);
            // Without a periodic write the idle stream is closed after ~12s. A comment
            // frame keeps it open and does not reach the client's message handler.
            const heartbeat = setInterval(() => {
              try {
                client.write(": keep-alive\n\n");
              } catch {
                clearInterval(heartbeat);
                clients.delete(client);
              }
            }, 5000);
            request.signal.addEventListener("abort", () => {
              clearInterval(heartbeat);
              clients.delete(client);
            });
          },
        }),
        { headers: { "content-type": "text/event-stream", "cache-control": "no-cache" } },
      );
    }

    const path = decodeURIComponent(url.pathname);
    const target = resolve(join(root, path));
    if (relative(root, target).startsWith("..")) return new Response("Forbidden", { status: 403 });

    const file = Bun.file(target);
    if (await file.exists()) {
      const type = TYPES[extname(target)] ?? "application/octet-stream";
      if (!type.startsWith("text/html")) {
        return new Response(file, { headers: { "content-type": type, "cache-control": "no-store" } });
      }
      const html = await file.text();
      const injected = html.includes("</body>")
        ? html.replace("</body>", `${RELOAD_CLIENT}\n</body>`)
        : html + RELOAD_CLIENT;
      return new Response(injected, { headers: { "content-type": type, "cache-control": "no-store" } });
    }

    const glob = new Bun.Glob("**/*.html");
    const specs = (await Array.fromAsync(glob.scan({ cwd: root }))).sort();
    const links = specs.map((s) => `<li><a href="/${s}">${s}</a></li>`).join("\n");
    // A missing document says so and names what this server is serving. Answering an
    // unknown path with the index makes a wrong port look like a working page.
    const missing = path !== "/";
    return new Response(
      `<!doctype html><meta charset="utf-8"><title>${missing ? "Not found" : "Specs"}</title>
       <style>body{font:16px/1.6 system-ui;max-width:44rem;margin:3rem auto;padding:0 1rem}
       li{margin:.3rem 0}code{background:#f4f4f4;padding:.1rem .3rem;border-radius:3px}
       .warn{border-left:4px solid #b34700;padding-left:1rem}</style>
       ${missing ? `<div class="warn"><h1>No such spec here</h1>
         <p><code>${path}</code> is not in the directory this server is serving.</p>
         <p>Serving <code>${root}</code> on port ${port}. If you expected a different
         project, another server is on this port, or this one was started elsewhere.</p></div>`
        : `<h1>Specs</h1>`}
       <h2>Available</h2><ul>${links}</ul>${RELOAD_CLIENT}`,
      { status: missing ? 404 : 200, headers: { "content-type": "text/html; charset=utf-8" } },
    );
  }
});

console.log(`Serving ${root} on http://localhost:${server.port} (reload on change)`);
