import { expect, test } from "bun:test";
import { withJjMods } from "./installLayout";
import { withNerdHerdStatus } from "./installStatus";

const layout = (status: string) =>
  `{ "id": "root", "children": [ { "id": "status", "type": "block", "content": { "mod": "${status}" } } ] }`;
const statusOf = (text: string): unknown => JSON.parse(text).children[0].content.mod;

// Spec: docs/specs/finalized/nerd-herd-agents.html#spec-question-how-dismiss-gets-into-the-status-bar@jj:14ab73a0
// "The install names it in the status block in place of the original."
test("the install shows nerd-herd's copy of Herdr's status bar, or of the jj status bar where the home has it", () => {
  const herdrs = withNerdHerdStatus(withJjMods(layout("workspace-status"), () => false));
  const jjs = withNerdHerdStatus(withJjMods(layout("workspace-status"), (m) => m === "jj-status"));
  expect([statusOf(herdrs), statusOf(jjs)], "the matching nerd-herd copy in each home").toEqual([
    "nerd-herd-status",
    "nerd-herd-jj-status",
  ]);
});
