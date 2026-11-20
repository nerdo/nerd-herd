// Drives one Herdr test window, isolated from the person's own window by HERDR_APP_HOME.
// By default it shares the person's herdr-core, so these helpers never create, rename, or move
// spaces, tabs, or terminals: they only send commands to nerd-herd and read what the window draws.
// A walk that needs sessions of its own gives the window a private core (AgentsWindow).

import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "@playwright/test";
import { e2eSettings } from "./e2e-settings";
import { prepareFakeCurl } from "./fake-curl";
import { findSidebarPx } from "./sidebar-width";
import { savedWindowSize, type WindowPoints } from "./saved-window";
import { linesIn, type PlacedLine, rowsIn } from "./text-rows";

export type { PlacedLine };

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

  /** `core`: extra variables for every command, such as HC_SESSION for a private herdr-core. */
  constructor(private readonly core: Record<string, string> = {}) {}

  protected env(): Record<string, string> {
    // The fake curl copies the committed banner fixture, so tests need no internet.
    return {
      HERDR_APP_HOME: this.home,
      PATH: `${e2eSettings.fakeBin}:${process.env.PATH ?? ""}`,
      // The test process owns the window: when it ends, even interrupted, the window is quit.
      NERD_HERD_OWNER_PID: String(process.pid),
      ...(this.direct ? { NERD_HERD_LAUNCH: "direct" } : {}),
      // On the person's own herdr-core, only the Spaces mod (scripts/settings.ts, mods).
      NERD_HERD_MODS: "spaces",
      ...this.core,
    };
  }

  /** Starts a fresh test home with the project's own start command, the way a person starts it. */
  start(
    seed: Record<string, unknown> = {},
    size: WindowPoints = e2eSettings.windowSize,
    launch: "background" | "direct" = "background",
  ): void {
    this.direct = launch === "direct";
    this.sidebarPx = null;
    rmSync(this.home, { recursive: true, force: true });
    mkdirSync(this.home, { recursive: true });
    prepareFakeCurl();
    // A person closes Herdr's welcome screen once; its close button records "skipped" in Herdr's shared
    // state (frame/welcome/main.js), and Herdr then never shows it again. The fresh home starts so.
    writeFileSync(
      join(this.home, "shared.json"),
      JSON.stringify({ "frame.welcomed": "skipped", ...seed }),
    );
    // Herdr opens at the size its home's window.json saved: seeded 1200 by 634, it opened 1200 by 634;
    // with none, 1280 by 820 (2026-11-18). Herdr picks the position itself. A tiling window manager
    // still resizes a window it manages, so float the test windows there (AGENTS.md).
    writeFileSync(
      join(this.home, "window.json"),
      JSON.stringify({ state: "windowed", bounds: [0, 0, size.width, size.height] }),
    );
    const r = run(["bun", "run", "herdr:install"], this.env());
    if (r.code !== 0) throw new Error(`bun run herdr:install failed: ${r.out}\n${r.err}`);
    this.setAppearance();
    // Spaces and Agents share the sidebar evenly, so a long Spaces list is cut off at Agents and its
    // reading depends on where Herdr scrolled it. Like a person dragging the divider down, give
    // Spaces most of the height; Herdr keeps the size in this home, through restarts too.
    this.herdr("layout.resize", { id: "agents", weight: 0.25 });
  }

  /** Closes the window and starts it again on the same home, as a person restarting Herdr. */
  restart(): void {
    this.stop();
    const r = run(["bun", "run", "herdr:install"], this.env());
    if (r.code !== 0) throw new Error(`bun run herdr:install failed: ${r.out}\n${r.err}`);
  }

  /** True when this walk's window runs Herdr directly, keeping the fake curl on its PATH. */
  private direct = false;

  /** The sidebar width this walk last set, in points; null until it sets one. */
  private sidebarPx: number | null = null;

  /** Adds the walks' appearance to the settings Herdr wrote for this home; Herdr applies it live. */
  private setAppearance(): void {
    const file = join(this.home, "settings.json");
    const saved: unknown = JSON.parse(readFileSync(file, "utf8"));
    const settings = typeof saved === "object" && saved !== null ? saved : {};
    writeFileSync(file, JSON.stringify({ ...settings, appearance: e2eSettings.appearance }));
    sleep(400);
  }

  stop(): void {
    run(["bun", "scripts/stop-window.ts"], this.env());
  }

  /** Runs one of Herdr's own commands with JSON arguments, as `herdr-app do <name> '<json>'`. */
  herdr(name: string, args: Record<string, unknown>): void {
    // Herdr does not save a resize to the layout file at once, so the width this walk gave the
    // sidebar is kept here for reading its column (2026-11-17: a 140-point rail read with the saved
    // 268-point column took in terminal text beside it).
    if (name === "layout.resize" && args.id === "sidebar" && typeof args.px === "number")
      this.sidebarPx = args.px;
    const r = run(["herdr-app", "do", name, JSON.stringify(args)], this.env());
    if (r.code !== 0) throw new Error(`herdr-app do ${name} failed: ${r.out}\n${r.err}`);
    sleep(400);
  }

  /** Herdr's answer to `herdr-app <what>` (ls or status), parsed. */
  ask(what: "ls" | "status"): unknown {
    return JSON.parse(run(["herdr-app", what], this.env()).out);
  }

  /** The next screenshot's path: named by the walk's file and numbered, kept for the whole run. */
  private shotPath(): string {
    this.shots += 1;
    mkdirSync(e2eSettings.shots, { recursive: true });
    const walk = test.info().file.split("/").pop()?.replace(".spec.ts", "");
    return join(e2eSettings.shots, `${walk}-${this.shots}.png`);
  }

  /** Presses one of the Spaces mod's keys: sends the action its keys.json binding sends. */
  key(name: string): void {
    this.send(`nerd-herd-spaces.${name}`);
  }

  /** Sends one action to the nerd-herd Spaces mod. */
  act(action: string, payload: unknown): void {
    this.send(`nerd-herd-spaces.${action}:${JSON.stringify(payload)}`);
  }

  protected send(command: string): void {
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
    if (r.code !== 0) throw new Error(`command ${command} failed: ${r.out}\n${r.err}`);
    sleep(400);
  }

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

  /** The whole window's text, top to bottom, for dialogs drawn past the sidebar. */
  readWindow(): ScreenLines {
    sleep(1500);
    const shot = this.shotPath();
    const s = run(["herdr-app", "shot", shot], this.env());
    if (s.code !== 0) throw new Error(`herdr-app shot failed: ${s.out}\n${s.err}`);
    const t = run([e2eSettings.readText, shot]);
    if (t.code !== 0) throw new Error(`read-text failed: ${t.err}`);
    return linesIn(t.out);
  }

  /**
   * An open dialog's text, read the way a person reads a dialog taller than the window: the top, then
   * a step down at a time (dialog-down, six fields a step, enough steps for 42 fields), then its end
   * (dialog-end). A step that moved nothing, because its field was already in view, adds nothing.
   */
  readDialog(): ScreenLines {
    const pieces = [this.readWindow()];
    for (let n = 0; n < 7; n++) {
      this.key("dialog-down");
      const next = this.readWindow();
      if (next.join("\n") !== pieces.at(-1)?.join("\n")) pieces.push(next);
    }
    this.key("dialog-end");
    pieces.push(this.readWindow());
    return pieces.flat();
  }

  /**
   * Reads until the sidebar shows what the test is waiting for, up to 20 s, as a person waits for
   * the sidebar to finish loading; returns the last reading either way, for the test to judge.
   */
  readUntil(shows: (lines: ScreenLines) => boolean): ScreenLines {
    const until = Date.now() + 20_000;
    let lines = this.read();
    while (!shows(lines) && Date.now() < until) lines = this.readOnce();
    return lines;
  }

  /** Like read(), with each line's left edge, for checks on where a line is drawn. */
  readPlaced(): readonly PlacedLine[] {
    let last = this.placedOnce();
    for (let n = 1; n < 8; n++) {
      const next = this.placedOnce();
      if (next.map((l) => l.text).join("\n") === last.map((l) => l.text).join("\n")) return next;
      last = next;
    }
    return last;
  }

  private readOnce(): ScreenLines {
    return this.placedOnce().map((l) => l.text);
  }

  private placedOnce(): readonly PlacedLine[] {
    sleep(1500);
    // Every read keeps its own screenshot, numbered, so a failed reading can be checked by eye.
    const shot = this.shotPath();
    const s = run(["herdr-app", "shot", shot], this.env());
    if (s.code !== 0) throw new Error(`herdr-app shot failed: ${s.out}\n${s.err}`);
    const edge = this.sidebarEdge(shot);
    const t = run([e2eSettings.readText, shot, String(edge)]);
    if (t.code !== 0) throw new Error(`read-text failed: ${t.err}`);
    return rowsIn(t.out, edge, this.windowPoints(shot));
  }

  /** A screenshot of the settled window, with the sidebar's right edge as a fraction of its width. */
  screenshot(): { shot: string; edge: number } {
    sleep(1500);
    const shot = this.shotPath();
    const s = run(["herdr-app", "shot", shot], this.env());
    if (s.code !== 0) throw new Error(`herdr-app shot failed: ${s.out}\n${s.err}`);
    return { shot, edge: this.sidebarEdge(shot) };
  }

  /**
   * The window's size in points, read from a screenshot of it: what the window manager gave the
   * window, whatever its home's window.json asked for. The walks' displays show one pixel per point
   * (a 1200 by 634 point window gave a 1200 by 634 pixel screenshot, 2026-11-18).
   */
  shownSize(): WindowPoints {
    const shot = this.shotPath();
    const s = run(["herdr-app", "shot", shot], this.env());
    if (s.code !== 0) throw new Error(`herdr-app shot failed: ${s.out}\n${s.err}`);
    const png = readFileSync(shot);
    // A PNG's header holds its width and height as 32-bit numbers at bytes 16 and 20.
    return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
  }

  /** The window's size in points, as Herdr saved it in window.json; null before Herdr writes it. */
  windowSize(): WindowPoints | null {
    return savedWindowSize(this.home);
  }

  /** The window's width in points: window.json, or until Herdr writes it, the screenshot's width
   *  (they were equal on 2026-11-17, both 1069). */
  private windowPoints(shot: string): number {
    return this.windowSize()?.width ?? readFileSync(shot).readUInt32BE(16);
  }

  /**
   * The sidebar's right edge as a fraction of the screenshot: its width in points (the layout) times
   * Herdr's zoom (settings.json; Herdr's status does not report it), over the window's width in points
   * (window.json). The screenshot covers the window, so the fraction holds at any pixel density.
   */
  private sidebarEdge(shot: string): number {
    const json = (file: string): unknown => JSON.parse(readFileSync(join(this.home, file), "utf8"));
    const width = this.sidebarPx ?? findSidebarPx(json("layouts/nerd-herd.json"));
    const settings = json("settings.json");
    const zoom =
      typeof settings === "object" &&
      settings !== null &&
      "zoom" in settings &&
      typeof settings.zoom === "number"
        ? settings.zoom
        : 1;
    return (width * zoom) / this.windowPoints(shot);
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
}
