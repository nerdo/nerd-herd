// The Agents mod's walking skeleton: the narrative's skeleton journey, walked in a test window.
// Spec: docs/specs/finalized/nerd-herd-agents.html#sec-narrative@jj:14ab73a0
// "Dannel opens the Herdr sidebar and sees each running agent session with its title first and its
//  space and machine after it, its full subject wrapped onto more lines, renames one session from
//  its card and sees the new name in the card and in Herdr's tab bar, and clicks a card to focus
//  that session's pane."
//
// The window runs on a private herdr-core session (HC_SESSION), never the person's own core, so the
// walk may make the space, the tabs and the stand-in agent it needs (AGENTS.md, rule 4).
// The journey is walked once; the skeleton's assertion and the build's current step read it.

import { expect, test } from "@playwright/test";
import { AgentsWindow, type TerminalAddress } from "./support/agents-window";

const window = new AgentsWindow();

const subject = "THRD: Reset leader election across every replica in the cluster";
const newName = "NAS drive health";

let walked: {
  agent: TerminalAddress;
  other: TerminalAddress;
  before: string;
  after: string;
  tab: string | undefined;
  focused: TerminalAddress | undefined;
};

test.beforeAll(() => {
  window.start();
  const agent = window.startFakeAgent({ space: "sandbox", title: subject });
  const other = window.startShellTab();
  const before = window.readAgents();
  window.actAgents("rename", { terminal: agent, name: newName });
  const after = window.readAgents();
  const tab = window.tabNameOf(agent);
  window.actAgents("focus", { terminal: agent });
  const focused = window.focusedTerminal();
  walked = { agent, other, before, after, tab, focused };
});

test.afterAll(() => window.stop());

// Expected to fail until the whole build is done: the skeleton's red is the build's progress meter.
test.fail(
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
      before: `${subject} sandbox · This computer`,
      after: `${newName} sandbox · This computer`,
      tab: newName,
      focused: agent,
    });
  },
);

// The build's current step: which seams on the thread are still stubs (rewritten before each walk).
test("step 6 of 6: every seam on the thread is real, and the session list arranges nothing", () => {
  const { before, after, tab, focused, agent } = walked;
  const read = "";
  expect(
    { before, after, tab, focused },
    "no stub left: the list is empty, the tab is renamed, the agent's pane is focused",
  ).toEqual({
    before: read,
    after: read,
    tab: newName,
    focused: agent,
  });
});
