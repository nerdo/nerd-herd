// Dismissing a finished session: opening it keeps it under Done, dismissing it moves it to Idle and
// records its turn as handled on the machine it runs on. Driven through the mod's own dismiss
// command (AGENTS.md, rule 3); a stand-in machine is a private herdr-core session on this computer.

import { expect, test } from "@playwright/test";
import { AgentsWindow, type TerminalAddress } from "./support/agents-window";

const window = new AgentsWindow();
const local = "Reset leader election";
const remote = "Ship the release";

let opened: string;
let dismissed: string;
let localLabels: unknown;
let localTurn: number;
let remoteLabels: unknown;
let remoteTurn: number;

test.beforeAll(() => {
  window.start();
  window.addMachine("desk-client");
  const agent: TerminalAddress = window.startFakeAgent({ space: "sandbox", title: local });
  const far: TerminalAddress = window.startFakeAgent({
    space: "client",
    title: remote,
    machine: "desk-client",
  });
  window.startShellTab();
  window.readAgentsWithSections();
  window.actAgents("focus", { terminal: agent });
  window.startShellTab();
  opened = window.readAgentsWithSections();
  window.actAgents("focus", { terminal: agent });
  window.sendAgents("dismiss");
  window.actAgents("focus", { terminal: far });
  window.sendAgents("dismiss");
  dismissed = window.readAgentsWithSections();
  localTurn = window.turnOf(agent);
  localLabels = window.labelsOn(agent);
  remoteTurn = window.turnOf(far);
  remoteLabels = window.labelsOn("t1", "desk-client");
});

test.afterAll(() => window.stop());

// Spec: docs/specs/finalized/nerd-herd-agents.html#test-case-a-session-herdr-counts-as-seen-stays-under-done@jj:14ab73a0
// Claim "Opening a Done session and leaving it keeps it under Done".
test("opening a Done session and leaving it keeps it under Done", () => {
  expect(opened, "both finished sessions under Done").toMatch(new RegExp(`^Done .*${local}`));
});

// Spec: docs/specs/finalized/nerd-herd-agents.html#test-case-dismissing-records-the-session-s-turn-on-its-machine@jj:14ab73a0
test("dismissing the focused Done sessions moves them to Idle", () => {
  expect(dismissed, "Idle, both cards, no Done").toMatch(/^Idle /);
});

test("dismissing a session on this computer records its turn as nerd-herd.handled", () => {
  expect(localLabels, "the handled label").toMatchObject({
    "nerd-herd.handled": String(localTurn),
  });
});

test("dismissing a session on another machine records the label on that machine's core", () => {
  expect(remoteLabels, "the handled label on desk-client").toMatchObject({
    "nerd-herd.handled": String(remoteTurn),
  });
});
