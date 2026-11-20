import { expect, test } from "bun:test";
import { dismissal } from "./dismiss";

// Spec: docs/specs/finalized/nerd-herd-agents.html#test-case-dismissing-records-the-session-s-turn-on-its-machine@jj:14ab73a0
// "The focused session is desk-client's terminal t1y at turn 28, under Done: when Dannel presses
//  the dismiss key, nerd-herd runs hc label desk-client/t1y nerd-herd.handled=28."
test("dismissing the focused session under Done at turn 28 labels its terminal nerd-herd.handled=28", () => {
  expect(
    dismissal(
      "desk-client/t1y",
      [{ address: "desk-client/t1y", turn: 28 }],
      new Set(["desk-client/t1y"]),
    ),
    "the hc label arguments",
  ).toEqual(["label", "desk-client/t1y", "nerd-herd.handled=28"]);
});

// Spec: docs/specs/finalized/nerd-herd-agents.html#spec-question-dismiss-button-placement@jj:14ab73a0
// Dismiss acts on "the focused session under Done"; a focused session that is not under Done has
// nothing to dismiss.
test("dismissing while the focused session is not under Done gives no hc command", () => {
  expect(dismissal("t2", [{ address: "t2", turn: 4 }], new Set()), "no command").toBeNull();
});
