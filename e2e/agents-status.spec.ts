// The status bar's Dismiss: purple, in the status bar's center, while the focused session is under
// Done, and gone once it is dismissed. The window runs on a private herdr-core session.

import { expect, test } from "@playwright/test";
import { AgentsWindow } from "./support/agents-window";
import { colorCount } from "./support/window-pixels";

const window = new AgentsWindow();

/** The status bar's middle third: the bottom rows of the window, between a third and two thirds. */
const center = { from: 1 / 3, to: 2 / 3, top: 0.965 } as const;
/** Any magenta-family pixel: red and blue well above green (Herdr themes' ansi5 is in that family). */
const purple = (): number => colorCount(window, "#ff00ff", center, "tinted");
// The window's whole text: only the status bar's button says Dismiss, and the window's bottom row
// also holds Herdr's own toasts, so a single "last line" is not the status bar (2026-11-20).
const statusLine = (): string => window.readWindow().join(" ");

let before: { line: string; purple: number; agents: string };
let after: { line: string; purple: number; agents: string };
let handled: unknown;
let turn: number;

test.beforeAll(() => {
  window.start();
  const agent = window.startFakeAgent({ space: "sandbox", title: "Reset leader election" });
  window.startShellTab();
  window.readAgents();
  // The wrong click: Dannel opens the session, and leaves it for another tab.
  window.actAgents("focus", { terminal: agent });
  window.startShellTab();
  window.actAgents("focus", { terminal: agent });
  before = { line: statusLine(), purple: purple(), agents: window.readAgentsWithSections() };
  window.sendAgents("dismiss");
  after = { line: statusLine(), purple: purple(), agents: window.readAgentsWithSections() };
  turn = window.turnOf(agent);
  const labels = window.labelsOn(agent);
  handled =
    typeof labels === "object" && labels !== null
      ? Object.getOwnPropertyDescriptor(labels, "nerd-herd.handled")?.value
      : undefined;
});

test.afterAll(() => window.stop());

// Spec: docs/specs/finalized/nerd-herd-agents.html#test-case-dismissing-a-done-session-after-a-wrong-click@jj:14ab73a0
// "Before the dismissal, the screenshot shows the session under Done and a purple Dismiss in the
//  center of the status bar; after it, ... Dismiss is gone from the status bar."
test("while the focused session is under Done, the status bar shows a purple Dismiss in its center", () => {
  expect(
    { dismiss: before.line.includes("Dismiss"), purple: before.purple > 40 },
    "Dismiss in the status bar, drawn in purple in its middle third",
  ).toEqual({ dismiss: true, purple: true });
});

test("once the focused session is dismissed, the status bar shows no Dismiss", () => {
  expect(
    { dismiss: after.line.includes("Dismiss"), purple: after.purple },
    "no Dismiss and no purple in its middle third",
  ).toEqual({ dismiss: false, purple: 0 });
});

// Spec: docs/specs/finalized/nerd-herd-agents.html#test-case-dismissing-a-done-session-after-a-wrong-click@jj:14ab73a0
// UX validation: the experience before and after, and the label on the session's machine, together.
test("after a wrong click, dismissing moves the session from Done to Idle, removes Dismiss, and records its turn", () => {
  expect(
    {
      before: [before.agents.split(" ")[0], before.line.includes("Dismiss")],
      after: [after.agents.split(" ")[0], after.line.includes("Dismiss")],
      handled,
    },
    "Done with Dismiss, then Idle without it, the handled label at the session's turn",
  ).toEqual({ before: ["Done", true], after: ["Idle", false], handled: String(turn) });
});
