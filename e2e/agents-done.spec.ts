// The Done ledger on the running thread: a finished session nobody looked at sits under Done, and
// once its turn carries the nerd-herd.handled label it sits under Idle, though Herdr still calls it
// done. The label is set with hc on the walk's private herdr-core session.

import { expect, test } from "@playwright/test";
import { AgentsWindow } from "./support/agents-window";

const window = new AgentsWindow();
const subject = "Reset leader election";
let before: string;
let after: string;

test.beforeAll(() => {
  window.start();
  const agent = window.startFakeAgent({ space: "sandbox", title: subject });
  // A second tab takes the focus, so nobody is looking at the agent when it finishes.
  window.startShellTab();
  before = window.readAgentsWithSections();
  window.label(agent, `nerd-herd.handled=${window.turnOf(agent)}`);
  after = window.readAgentsWithSections();
});

test.afterAll(() => window.stop());

// Spec: docs/specs/finalized/nerd-herd-agents.html#test-case-a-finished-turn-above-the-handled-turn-is-under-done@jj:14ab73a0
// and the card structure decision (question "Card structure", 2026-11-20): a status pill shows its
// count, so the reading is "Done 1".
test("a session that finished a turn nobody has dealt with shows under Done", () => {
  expect(before, "Done with its count, then the card").toBe(
    `Done 1 ${subject} sandbox This computer`,
  );
});

// Spec: docs/specs/finalized/nerd-herd-agents.html#test-case-dismissing-records-the-session-s-turn-on-its-machine@jj:14ab73a0
// "...and Done ledger then puts the session under Idle."
test("once its finished turn is recorded as handled, the session shows under Idle", () => {
  expect(after, "Idle with its count, then the card").toBe(
    `Idle 1 ${subject} sandbox This computer`,
  );
});
