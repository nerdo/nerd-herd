// A Herdr test window on a private herdr-core session (HC_SESSION), so a walk may make the spaces,
// tabs and stand-in agents it needs, and rename them, without touching the person's own core
// (AGENTS.md, rule 4). The session's state folder is deleted before each start and after the stop.

import { spawnSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { e2eSettings } from "./e2e-settings";
import { HerdrWindow } from "./herdr-window";

export type TerminalAddress = string;

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const session = e2eSettings.coreSession;
const coreState = join(homedir(), ".local/state/herdr-core", session);
const sleep = (ms: number) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const hc = (...args: string[]) =>
  spawnSync("hc", args, { env: { ...process.env, HC_SESSION: session }, encoding: "utf8" });

const field = (value: unknown, key: string): unknown =>
  typeof value === "object" && value !== null
    ? Object.getOwnPropertyDescriptor(value, key)?.value
    : undefined;
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

/** Section headers Herdr's Agents list draws above its rows, such as "Idle 1". */
const sectionHeader = /^(Agents|Blocked|Done|Working|Idle)(\s+\d+)?$/;

/** A stand-in machine is another private herdr-core session on this computer, reached by `sh -c`.
 *  Sessions are numbered, not named: herdr-core's socket path has a length limit (2026-11-20). */
const machineSession = (n: number) => `${session}-${n}`;

export class AgentsWindow extends HerdrWindow {
  private readonly machines: string[] = [];

  constructor() {
    super({ HC_SESSION: session, NERD_HERD_MODS: "spaces,agents" });
  }

  override start(...args: Parameters<HerdrWindow["start"]>): void {
    this.stopCore();
    super.start(...args);
    // The Spaces walks shrink Agents to a quarter of the sidebar; these walks read Agents, so give
    // it most of the height back, or long cards are cut off under the sidebar's footer.
    this.herdr("layout.resize", { id: "agents", weight: 3 });
  }

  override stop(): void {
    super.stop();
    this.stopCore();
  }

  private stopCore(): void {
    this.machines.splice(0).forEach((_name, i) => {
      spawnSync("hc", ["server", "stop"], {
        env: { ...process.env, HC_SESSION: machineSession(i + 1) },
      });
      rmSync(`${coreState}-${i + 1}`, { recursive: true, force: true });
    });
    hc("server", "stop");
    rmSync(coreState, { recursive: true, force: true });
  }

  /** Adds a stand-in machine to the private core: another private session on this computer. Not
   *  --temp: Herdr leaves temporary machines out of its lists (2026-11-20). */
  addMachine(name: string): void {
    const r = hc(
      "machine",
      "add",
      "--via",
      "sh -c",
      "--name",
      name,
      "--session",
      machineSession(this.machines.length + 1),
    );
    if (r.status !== 0) throw new Error(`hc machine add ${name} failed: ${r.stdout}${r.stderr}`);
    this.machines.push(name);
  }

  /** Makes a space running the stand-in agent with this title (on `machine`, else this computer);
   *  returns the agent's terminal. */
  startFakeAgent(o: { space: string; title: string; machine?: string }): TerminalAddress {
    const space = {
      name: o.space,
      folder: root,
      argv: [join(root, "e2e/support/fake-agent.sh"), o.title],
      ...(o.machine ? { machine: o.machine } : {}),
    };
    // Herdr learns of a machine the core just added a moment later; until then it says it has none.
    for (let waited = 0; ; waited += 500) {
      const r = spawnSync("herdr-app", ["do", "space.new", JSON.stringify(space)], {
        env: { ...process.env, ...this.env() },
        encoding: "utf8",
      });
      if (r.status === 0) break;
      if (!r.stdout.includes("has no machine") || waited >= 15_000)
        throw new Error(`herdr-app do space.new failed: ${r.stdout}${r.stderr}`);
      sleep(500);
    }
    for (let waited = 0; waited < 10_000; waited += 500) {
      const agent = this.terminals().find((t) => t.space === o.space);
      if (agent) return agent.terminal;
      sleep(500);
    }
    throw new Error(`The stand-in agent's space "${o.space}" never appeared in herdr-app ls`);
  }

  /** Opens a plain shell tab in the shown space, which Herdr focuses; returns its terminal. */
  startShellTab(): TerminalAddress {
    const before = new Set(this.terminals().map((t) => t.terminal));
    this.herdr("tab.new", {});
    const added = this.terminals().find((t) => !before.has(t.terminal));
    if (!added) throw new Error("tab.new made no terminal");
    return added.terminal;
  }

  /**
   * The Agents section's text: below its header and above the sidebar's footer (Settings), section
   * headers left out, lines joined by spaces. The text reader reads an agent's icon as one letter
   * before the title ("E THRD: ...") and the middle dot as "•" (2026-11-20), so both are undone;
   * a title starting with a one-letter word would lose that word here.
   */
  readAgents(): string {
    const lines = this.read();
    const start = lines.reduce((last, l, i) => (/^Agents\b/.test(l) ? i : last), -1);
    const end = lines.findIndex((l, i) => i > start && /\bSettings$/.test(l));
    return lines
      .slice(start + 1, end === -1 ? undefined : end)
      .filter((l) => !sectionHeader.test(l))
      .map((l) => l.replace(/^\S /, "").replaceAll("•", "·"))
      .join(" ");
  }

  /** The Agents section's text with its section headers kept (Done, Idle, ...). */
  readAgentsWithSections(): string {
    const lines = this.read();
    const start = lines.reduce((last, l, i) => (/^Agents\b/.test(l) ? i : last), -1);
    const end = lines.findIndex((l, i) => i > start && /\bSettings$/.test(l));
    return lines
      .slice(start + 1, end === -1 ? undefined : end)
      .map((l) => l.replace(/^\S /, "").replaceAll("•", "·"))
      .join(" ");
  }

  /** Sets labels on a terminal in the private core, as `hc label` does. */
  label(terminal: TerminalAddress, ...pairs: string[]): void {
    const r = hc("label", terminal, ...pairs);
    if (r.status !== 0) throw new Error(`hc label failed: ${r.stdout}${r.stderr}`);
  }

  /** A terminal's labels as the core of the machine it runs on holds them: `machine` names a
   *  stand-in machine this window added (its own private session), else the window's core. */
  labelsOn(terminal: TerminalAddress, machine?: string): unknown {
    const n = machine === undefined ? -1 : this.machines.indexOf(machine);
    if (machine !== undefined && n < 0) throw new Error(`no stand-in machine ${machine}`);
    const r = spawnSync("hc", ["get", terminal, "--json"], {
      env: { ...process.env, HC_SESSION: n < 0 ? session : machineSession(n + 1) },
      encoding: "utf8",
    });
    return field(JSON.parse(r.stdout), "labels");
  }

  /** A terminal's turn count in the private core. */
  turnOf(terminal: TerminalAddress): number {
    const got: unknown = JSON.parse(hc("get", terminal, "--json").stdout);
    const turn = field(got, "turn");
    if (typeof turn !== "number") throw new Error(`hc get ${terminal} gave no turn`);
    return turn;
  }

  /** Sends one command to the nerd-herd Agents mod as written, readable or not. */
  sendAgents(command: string): void {
    this.send(`nerd-herd-agents.${command}`);
  }

  /** A value Herdr keeps in its shared state, as saved in the test home. */
  sharedValue(key: string): unknown {
    const saved: unknown = JSON.parse(readFileSync(join(this.home, "shared.json"), "utf8"));
    return field(saved, key);
  }

  /** Sends one action to the nerd-herd Agents mod. */
  actAgents(action: string, payload: unknown): void {
    this.send(`nerd-herd-agents.${action}:${JSON.stringify(payload)}`);
  }

  tabNameOf(terminal: TerminalAddress): string | undefined {
    return this.terminals().find((t) => t.terminal === terminal)?.tab;
  }

  /** The terminal in the pane Herdr reports focused (`herdr-app status`). */
  focusedTerminal(): TerminalAddress | undefined {
    const status = this.ask("status");
    const pane = field(status, "focused_pane");
    return this.terminals().find((t) => t.pane === pane)?.terminal;
  }

  /** Every terminal in `herdr-app ls`, with its space's and its tab's names. */
  private terminals(): { terminal: TerminalAddress; space: string; tab: string; pane: string }[] {
    return list(field(this.ask("ls"), "spaces")).flatMap((space) =>
      list(field(space, "tabs")).flatMap((tab) =>
        list(field(tab, "terminals")).map((t) => ({
          terminal: String(field(t, "terminal")),
          space: String(field(space, "name")),
          tab: String(field(tab, "name")),
          pane: String(field(t, "pane")),
        })),
      ),
    );
  }
}
