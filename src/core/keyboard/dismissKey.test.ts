import { expect, test } from "bun:test";
import { withDismissKey } from "./dismissKey";

// Spec: docs/specs/finalized/nerd-herd-agents.html#spec-question-dismiss-key@jj:14ab73a0
// "Dismiss is cmd-e, bound in the global section to the status bar mod's dismiss command", with
// Herdr's guide on merging a mod's keys: the person's own bindings stay theirs.
test("the install adds cmd-e for dismiss to the person's global keys and keeps the rest", () => {
  expect(withDismissKey({ global: { "cmd-q": "app.quit" } }), "cmd-q kept, cmd-e added").toEqual({
    global: { "cmd-q": "app.quit", "cmd-e": "nerd-herd-agents.dismiss" },
  });
});

test("a cmd-e the person already bound stays bound to their action", () => {
  expect(withDismissKey({ global: { "cmd-e": "pane.zoom" } }), "unchanged").toEqual({
    global: { "cmd-e": "pane.zoom" },
  });
});
