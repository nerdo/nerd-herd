// Drives one Herdr test window, isolated from the person's own window by HERDR_APP_HOME.
// It shares the person's herdr-core, so these helpers never create, rename, or move spaces,
// tabs, or terminals: they only send commands to nerd-herd and read what the window draws.

import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { e2eSettings } from "./e2e-settings";

export type ScreenLines = readonly string[];
export type MachineName = string;

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const sleep = (ms: number) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

const run = (cmd: string[], env: Record<string, string> = {}) => {
  const [file, ...args] = cmd;
  const p = spawnSync(file ?? "", args, {
    cwd: root,
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
  return { code: p.status, out: p.stdout ?? "", err: p.stderr ?? "" };
};

export class HerdrWindow {
  readonly home = e2eSettings.home;

  private env(): Record<string, string> {
    // The fake curl copies the committed banner fixture, so tests need no internet.
    return { HERDR_APP_HOME: this.home, PATH: `${e2eSettings.fakeBin}:${process.env.PATH ?? ""}` };
  }

  /** Starts a fresh test home with the project's own start command, the way a person starts it. */
  start(): void {
    rmSync(this.home, { recursive: true, force: true });
    mkdirSync(this.home, { recursive: true });
    this.prepareFakeCurl();
    const r = run(["bun", "run", "start"], this.env());
    if (r.code !== 0) throw new Error(`bun run start failed: ${r.out}\n${r.err}`);
    this.closeWelcome();
  }

  /** Closes the window and starts it again on the same home, as a person restarting Herdr. */
  restart(): void {
    this.stop();
    const r = run(["bun", "run", "start"], this.env());
    if (r.code !== 0) throw new Error(`bun run start failed: ${r.out}\n${r.err}`);
    this.closeWelcome();
  }

  stop(): void {
    run(["bun", "scripts/stop-window.ts"], this.env());
  }

  /** Sends one action to the nerd-herd Spaces mod. */
  act(action: string, payload: unknown): void {
    const command = `nerd-herd-spaces.${action}:${JSON.stringify(payload)}`;
    // Right after the layout switch the mod may not have loaded yet; Herdr says so and the command is retried.
    let r = run(["herdr-app", "do", command], this.env());
    for (
      let waited = 0;
      r.code !== 0 && r.out.includes("need the mod loaded") && waited < 15_000;
      waited += 500
    ) {
      sleep(500);
      r = run(["herdr-app", "do", command], this.env());
    }
    if (r.code !== 0) throw new Error(`action ${action} failed: ${r.out}\n${r.err}`);
    sleep(400);
  }

  /** Captures the window and returns the text drawn in the sidebar column, top to bottom. */
  read(): ScreenLines {
    sleep(1500);
    const shot = join(this.home, "shot.png");
    const s = run(["herdr-app", "shot", shot], this.env());
    if (s.code !== 0) throw new Error(`herdr-app shot failed: ${s.out}\n${s.err}`);
    const t = run([e2eSettings.readText, shot]);
    if (t.code !== 0) throw new Error(`read-text failed: ${t.err}`);
    const edge = this.sidebarEdge(shot);
    return t.out
      .split("\n")
      .map((line) => line.split("\t"))
      .flatMap(([pos, text]) => {
        const [left, top] = (pos ?? "").split(" ").map(Number);
        return left !== undefined && top !== undefined && text && left < edge
          ? [{ top, text: text.trim() }]
          : [];
      })
      .sort((a, b) => a.top - b.top)
      .map((l) => l.text);
  }

  /** The sidebar's right edge as a fraction of the screenshot: its width in points times the zoom, over the image width. */
  private sidebarEdge(shot: string): number {
    const layout: unknown = JSON.parse(
      readFileSync(join(this.home, "layouts/nerd-herd.json"), "utf8"),
    );
    const width = findSidebarPx(layout);
    const status: unknown = JSON.parse(run(["herdr-app", "status"], this.env()).out);
    const zoom =
      typeof status === "object" &&
      status !== null &&
      "zoom" in status &&
      typeof status.zoom === "number"
        ? status.zoom
        : 1;
    const png = readFileSync(shot);
    return (width * zoom) / png.readUInt32BE(16);
  }

  /** A fresh or restarted window can show Herdr's welcome screen over the sidebar; a person closes it first. */
  private closeWelcome(): void {
    for (let waited = 0; waited < 10_000; waited += 500) {
      const status = run(["herdr-app", "status"], this.env()).out;
      if (status.includes("frame-welcome"))
        run(["herdr-app", "do", "overlay.close", "--id", "frame-welcome"], this.env());
      else if (waited >= 2_000) return;
      sleep(500);
    }
  }

  /** The first reachable machine other than this computer, from herdr-core's own list. */
  remoteMachine(): MachineName {
    const r = run(["hc", "machine", "ls", "--json"]);
    const parsed: unknown = JSON.parse(r.out);
    const list =
      typeof parsed === "object" && parsed !== null && "machines" in parsed ? parsed.machines : [];
    for (const m of Array.isArray(list) ? list : []) {
      if (typeof m === "object" && m !== null && "state" in m && "name" in m && "temporary" in m) {
        if (m.state === "connected" && m.temporary === false && typeof m.name === "string")
          return m.name;
      }
    }
    throw new Error("No connected machine besides this computer; the walk needs one.");
  }

  private prepareFakeCurl(): void {
    mkdirSync(e2eSettings.fakeBin, { recursive: true });
    const script = [
      "#!/bin/sh",
      "# Test double for curl: copies the banner fixture to the -o path and prints what the real call prints.",
      'out=""; prev=""',
      'for a in "$@"; do if [ "$prev" = "-o" ]; then out="$a"; fi; prev="$a"; done',
      `cp "${e2eSettings.bannerFixture}" "$out"`,
      `printf '200 image/png %s' "$(wc -c < "${e2eSettings.bannerFixture}" | tr -d ' ')"`,
      "",
    ].join("\n");
    writeFileSync(join(e2eSettings.fakeBin, "curl"), script);
    chmodSync(join(e2eSettings.fakeBin, "curl"), 0o755);
  }
}

/** The sidebar block's width in points, found by its id in a layout. */
function findSidebarPx(node: unknown): number {
  if (typeof node !== "object" || node === null) return 0;
  if ("id" in node && node.id === "sidebar" && "size" in node) {
    const size = node.size;
    if (typeof size === "object" && size !== null && "px" in size && typeof size.px === "number")
      return size.px;
  }
  const children =
    "children" in node && Array.isArray(node.children) ? node.children : Object.values(node);
  return children.reduce((found: number, child: unknown) => found || findSidebarPx(child), 0);
}
