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
  private shots = 0;

  private env(): Record<string, string> {
    // The fake curl copies the committed banner fixture, so tests need no internet.
    return {
      HERDR_APP_HOME: this.home,
      PATH: `${e2eSettings.fakeBin}:${process.env.PATH ?? ""}`,
      // The test process owns the window: when it ends, even interrupted, the window is quit.
      NERD_HERD_OWNER_PID: String(process.pid),
    };
  }

  /** Starts a fresh test home with the project's own start command, the way a person starts it. */
  start(): void {
    rmSync(this.home, { recursive: true, force: true });
    mkdirSync(this.home, { recursive: true });
    this.prepareFakeCurl();
    const r = run(["bun", "run", "start"], this.env());
    if (r.code !== 0) throw new Error(`bun run start failed: ${r.out}\n${r.err}`);
    this.closeWelcome({ expected: true });
  }

  /** Closes the window and starts it again on the same home, as a person restarting Herdr. */
  restart(): void {
    this.stop();
    const r = run(["bun", "run", "start"], this.env());
    if (r.code !== 0) throw new Error(`bun run start failed: ${r.out}\n${r.err}`);
    this.closeWelcome({ expected: false });
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
  /**
   * Returns the sidebar's text once the screen has settled: readings 1.5 s apart until two in a row
   * agree, up to 8 readings. A person looks again when something is still loading, such as a banner.
   */
  read(): ScreenLines {
    let last = this.readOnce();
    for (let n = 1; n < 8; n++) {
      const next = this.readOnce();
      if (next.join("\n") === last.join("\n")) return next;
      last = next;
    }
    return last;
  }

  private readOnce(): ScreenLines {
    sleep(1500);
    // Herdr's welcome screen can open late, over the sidebar; a person closes it before looking.
    if (run(["herdr-app", "status"], this.env()).out.includes("frame-welcome")) {
      run(["herdr-app", "do", "overlay.close", "--id", "frame-welcome"], this.env());
      sleep(500);
    }
    // Every read keeps its own screenshot, numbered, so a failed reading can be checked by eye.
    this.shots += 1;
    const shot = join(this.home, `shot-${this.shots}.png`);
    const s = run(["herdr-app", "shot", shot], this.env());
    if (s.code !== 0) throw new Error(`herdr-app shot failed: ${s.out}\n${s.err}`);
    const edge = this.sidebarEdge();
    const t = run([e2eSettings.readText, shot, String(edge)]);
    if (t.code !== 0) throw new Error(`read-text failed: ${t.err}`);
    const blocks = t.out
      .split("\n")
      .map((line) => line.split("\t"))
      .flatMap(([pos, text]) => {
        const [left, top] = (pos ?? "").split(" ").map(Number);
        return left !== undefined && top !== undefined && text && left < edge
          ? [{ left, top, text: text.trim() }]
          : [];
      })
      .sort((a, b) => a.top - b.top);
    // Blocks drawn on one row (tops within a third of a row) are one line, read left to right.
    const rows: { top: number; blocks: typeof blocks }[] = [];
    for (const b of blocks) {
      const row = rows.at(-1);
      if (row && b.top - row.top < 0.008) row.blocks.push(b);
      else rows.push({ top: b.top, blocks: [b] });
    }
    return rows.map((r) =>
      r.blocks
        .sort((a, b) => a.left - b.left)
        .map((b) => b.text)
        .join(" "),
    );
  }

  /**
   * The sidebar's right edge as a fraction of the screenshot: its width in points (the layout) times
   * Herdr's zoom (settings.json; Herdr's status does not report it), over the window's width in points
   * (window.json). The screenshot covers the window, so the fraction holds at any pixel density.
   */
  private sidebarEdge(): number {
    const json = (file: string): unknown => JSON.parse(readFileSync(join(this.home, file), "utf8"));
    const width = findSidebarPx(json("layouts/nerd-herd.json"));
    const settings = json("settings.json");
    const zoom =
      typeof settings === "object" &&
      settings !== null &&
      "zoom" in settings &&
      typeof settings.zoom === "number"
        ? settings.zoom
        : 1;
    const window = json("window.json");
    const bounds =
      typeof window === "object" &&
      window !== null &&
      "bounds" in window &&
      Array.isArray(window.bounds)
        ? window.bounds
        : [];
    const windowWidth = bounds[2];
    if (typeof windowWidth !== "number") throw new Error("window.json has no window width");
    return (width * zoom) / windowWidth;
  }

  /**
   * A fresh home always opens Herdr's welcome screen over the sidebar, sometimes seconds after the
   * window answers; a person closes it first. Expected: wait for it (up to 15 s), close it, confirm it
   * is gone. Not expected (a restart): close it if it shows within 5 s.
   */
  private closeWelcome({ expected }: { expected: boolean }): void {
    const showing = () => run(["herdr-app", "status"], this.env()).out.includes("frame-welcome");
    let seen = false;
    for (let waited = 0; waited < (expected ? 15_000 : 12_000); waited += 500) {
      if (showing()) {
        seen = true;
        run(["herdr-app", "do", "overlay.close", "--id", "frame-welcome"], this.env());
      } else if (seen) return;
      sleep(500);
    }
    if (expected && !seen) throw new Error("Herdr's welcome screen never showed on a fresh home");
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
