// What a session's card does in Herdr: renaming it renames its tab, clearing the name brings back the
// automatic one, and clicking it focuses the session's pane. The walk drives the card's own commands
// (AGENTS.md, rule 3) on a private herdr-core session, so it may rename the tab it made.

import { expect, test } from "@playwright/test";
import { AgentsWindow, type TerminalAddress } from "./support/agents-window";

const window = new AgentsWindow();
const subject = "Reset leader election";

let renamedTab: string | undefined;
let clearedTab: string | undefined;
let clearedCard: string;
let focused: TerminalAddress | undefined;
let agent: TerminalAddress;
let strayTab: string | undefined;
let afterBroken: string | undefined;
let shell: TerminalAddress;

test.beforeAll(() => {
  window.start();
  agent = window.startFakeAgent({ space: "sandbox", title: subject });
  shell = window.startShellTab();
  // A person sees the card before acting on it: the walk waits for it too.
  window.readAgents();
  window.actAgents("rename", { terminal: "t99", name: "Stray name" });
  window.readAgents();
  strayTab = window.tabNameOf(shell);
  window.actAgents("rename", { terminal: agent, name: "NAS drive health" });
  // Herdr applies a rename a moment later; reading the card first waits for the screen to settle.
  window.readAgents();
  renamedTab = window.tabNameOf(agent);
  window.actAgents("rename", { terminal: agent, name: "" });
  clearedTab = window.tabNameOf(agent);
  clearedCard = window.readAgents();
  window.actAgents("focus", { terminal: agent });
  focused = window.focusedTerminal();
  window.sendAgents("rename:{not json");
  window.actAgents("rename", { terminal: agent, name: "After a broken command" });
  window.readAgents();
  afterBroken = window.tabNameOf(agent);
});

test.afterAll(() => window.stop());

// Spec: docs/specs/finalized/nerd-herd-agents.html#test-case-renaming-a-session-runs-herdr-s-tab-rename@jj:14ab73a0
// "A session in tab T: when Dannel renames it 'NAS drive health' from its card, Herdr's tab T is
//  named 'NAS drive health'."
test("renaming a session from its card names its Herdr tab", () => {
  expect(renamedTab, "the tab's name").toBe("NAS drive health");
});

// Spec: docs/specs/finalized/nerd-herd-agents.html#test-case-clearing-a-session-s-name-restores-its-automatic-name@jj:14ab73a0
// "A session whose tab is named 'NAS drive health': when Dannel renames it to an empty name,
//  Herdr receives tab.rename with an empty name, and the card shows the session's automatic name
//  (Herdr documents an empty name as returning a tab to its number)."
test("clearing a session's name returns its tab to its number and its card to the automatic name", () => {
  expect({ clearedTab, clearedCard }, "tab 1, and the card titled by the agent").toEqual({
    clearedTab: "1",
    clearedCard: `${subject} sandbox · This computer`,
  });
});

// Spec: docs/specs/finalized/nerd-herd-agents.html#test-case-clicking-a-session-card-focuses-its-pane@jj:14ab73a0
// "A session in pane P, and another pane focused: when Dannel clicks the session's card, Herdr
//  reports pane P as focused."
test("clicking a session's card focuses that session's pane", () => {
  expect(focused, "the agent's terminal is in the focused pane").toBe(agent);
});

// Found 2026-11-20: a rename for a terminal Herdr's agent list did not hold yet renamed the tab
// Herdr had selected. A card names one session; a rename for any other terminal names no tab.
test("a rename sent for a terminal Agents does not list leaves the shown tab's name as it was", () => {
  expect(strayTab, "the shell tab keeps its number").toBe("2");
});

// Found 2026-11-20 beside the stray rename: a command whose JSON cannot be read must not stop the
// mod from taking the commands after it.
test("after a command whose JSON cannot be read, the next rename still names the session's tab", () => {
  expect(afterBroken, "the tab's name").toBe("After a broken command");
});
