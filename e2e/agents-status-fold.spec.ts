// Folding a status in Agents: the Idle section folds to its pill while Done keeps its card, so one
// status can be read alone (the user, 2026-11-20: "sometimes I just want to expand the one node").
// Driven by the mod's own fold-status command on a private herdr-core session.

import { expect, test } from "@playwright/test";
import { AgentsWindow } from "./support/agents-window";

const window = new AgentsWindow();
let folded: string;

test.beforeAll(() => {
  window.start();
  const idle = window.startFakeAgent({ space: "sandbox", title: "Local notes" });
  window.startFakeAgent({ space: "client", title: "Ship the release" });
  window.startShellTab();
  window.readAgents();
  window.label(idle, `nerd-herd.handled=${window.turnOf(idle)}`);
  window.readAgents();
  window.actAgents("fold-status", { key: "idle" });
  folded = window.readAgentsWithSections();
});

test.afterAll(() => window.stop());

// Spec: docs/specs/in-progress/executing-nerd-herd-agents.html#test-case-a-folded-status-section-shows-its-pill-alone@jj:607ab1aa
test("folding the Idle section in Agents leaves its pill, while Done keeps its card", () => {
  expect(folded, "Done with its card, then the Idle pill alone").toBe(
    "Done 1 Ship the release client This computer Idle 1",
  );
});
