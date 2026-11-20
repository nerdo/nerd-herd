import { expect, test } from "bun:test";
import { sortChoices } from "./sortChoices";

// Spec: docs/specs/finalized/nerd-herd-agents.html#test-case-the-new-choice-uses-the-group-word@jj:14ab73a0
// "Spaces settings that call a group a folder: the sort menu's choices read Priority, Grouped by
//  space, Grouped by folder."
test("with Spaces calling a group a folder, the sort menu reads Priority, Grouped by space, Grouped by folder", () => {
  expect(
    sortChoices({ singular: "Folder", plural: "Folders" }).map((c) => c.label),
    "Herdr's two choices, then nerd-herd's in the group word",
  ).toEqual(["Priority", "Grouped by space", "Grouped by folder"]);
});
