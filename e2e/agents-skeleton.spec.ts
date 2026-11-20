// The Agents mod's walking skeleton: the narrative's skeleton journey, walked in a test window.
// Spec: docs/specs/finalized/nerd-herd-agents.html#sec-narrative@jj:14ab73a0
// "Dannel opens the Herdr sidebar and sees each running agent session with its title first and its
//  space and machine after it, its full subject wrapped onto more lines, renames one session from
//  its card and sees the new name in the card and in Herdr's tab bar, and clicks a card to focus
//  that session's pane."
// It is also the UX validation case
// docs/specs/finalized/nerd-herd-agents.html#test-case-reading-and-renaming-a-session-by-machine@jj:14ab73a0
// (renamed "Reading and renaming a session from its card" since): the card shows the new name, and
// Herdr lists the tab under that name.
//
// The window runs on a private herdr-core session (HC_SESSION), never the person's own core, so the
// walk may make the space, the tabs and the stand-in agent it needs (AGENTS.md, rule 4).
// The journey is walked once, before the assertion reads it.

import { expect, test } from "@playwright/test";
import { AgentsWindow, type TerminalAddress } from "./support/agents-window";

const window = new AgentsWindow();

const subject = "THRD: Reset leader election across every replica in the cluster";
const newName = "NAS drive health";

let walked: {
  agent: TerminalAddress;
  before: string;
  after: string;
  tab: string | undefined;
  focused: TerminalAddress | undefined;
};

test.beforeAll(() => {
  window.start();
  const agent = window.startFakeAgent({ space: "sandbox", title: subject });
  window.startShellTab();
  const before = window.readAgents();
  window.actAgents("rename", { terminal: agent, name: newName });
  const after = window.readAgents();
  const tab = window.tabNameOf(agent);
  window.actAgents("focus", { terminal: agent });
  const focused = window.focusedTerminal();
  walked = { agent, before, after, tab, focused };
});

test.afterAll(() => window.stop());

test(
  "Dannel sees each session's title first with its space and machine after it, the full subject " +
    "wrapped, renames one from its card and sees the name on the card and in the tab bar, and " +
    "clicks a card to focus that session's pane",
  () => {
    const { before, after, tab, focused, agent } = walked;
    expect(
      { before, after, tab, focused },
      "the card shows the whole subject, then space and machine; after the rename the card and " +
        "the tab carry the new name; clicking the card focuses the agent's pane",
    ).toEqual({
      before: `${subject} sandbox This computer`,
      after: `${newName} sandbox This computer`,
      tab: newName,
      focused: agent,
    });
  },
);
