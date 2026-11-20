// Pinning a session from its card in a running Herdr window, with Herdr's own pin (terminal.pin).
// Driven through the card's own command (AGENTS.md, rule 3) on a private herdr-core session.

import { expect, test } from "@playwright/test";
import { AgentsWindow } from "./support/agents-window";

const window = new AgentsWindow();
const subject = "Reset leader election";

let pinnedLabel: unknown;
let agentsText: string;

test.beforeAll(() => {
  window.start();
  const agent = window.startFakeAgent({ space: "sandbox", title: subject });
  window.startShellTab();
  window.readAgents();
  window.actAgents("pin", { terminal: agent });
  agentsText = window.readUntilAgents((text) => /Pinned/.test(text), { sections: true });
  const labels = window.labelsOn(agent);
  pinnedLabel =
    typeof labels === "object" && labels !== null
      ? Object.getOwnPropertyDescriptor(labels, "herdr.pinned")?.value
      : undefined;
});

test.afterAll(() => window.stop());

// Spec: docs/specs/in-progress/executing-nerd-herd-agents.html#test-case-pinning-from-a-card-runs-herdr-s-pin-and-moves-the-card-under-pinned
// "A running test window with one Idle session: when the walk sends the card's pin command, Herdr
//  reports the session's terminal pinned."
test("pinning from a card pins the session's terminal with Herdr's own pin", () => {
  expect(pinnedLabel, "the herdr.pinned label on the terminal").toBeTruthy();
});

// The same case: "... and Agents reads 'Pinned 1' followed by the card."
test("once pinned, Agents shows the card under Pinned with a count of 1", () => {
  expect(agentsText, "the Pinned pill, then the card").toBe(
    `Pinned 1 ${subject} sandbox This computer`,
  );
});
