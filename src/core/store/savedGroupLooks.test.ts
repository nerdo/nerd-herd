import { expect, test } from "bun:test";
import { makeGroup, setLook } from "../groups/groupActions";
import { emptyGroups } from "../groups/groupModel";
import { createGroupStore, type SharedState } from "./savedGroupStore";

const memoryShared = (): SharedState => {
  const values = new Map<string, unknown>();
  return { read: (key) => values.get(key), write: (key, value) => values.set(key, value) };
};

// Spec: docs/specs/finalized/nerd-herd-agents.html#spec-question-group-look-per-panel@jj:14ab73a0
// A group's Show as choices and its second banner style are saved group settings, so they are
// what Herdr shows again after a restart, like every other group setting.
test("a group's Show as choices and second banner links read back after a restart", () => {
  const groups = setLook(makeGroup(emptyGroups, { id: "f", name: "frankenstein" }), "f", {
    spacesLook: "second",
    agentsLook: "banner",
    secondOpenBanner: "https://b.example/q-open.png",
    secondFoldedBanner: "https://b.example/q-folded.png",
  });
  const shared = memoryShared();
  createGroupStore(shared).save(groups);
  expect(createGroupStore(shared).load().groups, "the same groups, looks included").toEqual(groups);
});

// Spec: docs/specs/in-progress/executing-nerd-herd-agents.html#spec-question-folding-attention-and-focus@jj:607ab1aa
// Agents' own overlay settings are saved group settings, so they read back after a restart; a group
// that never set them keeps them unset, which follows Spaces'.
test("a group's Agents overlay settings read back after a restart, and unset ones stay unset", () => {
  const groups = setLook(
    makeGroup(makeGroup(emptyGroups, { id: "t", name: "TSI" }), { id: "p", name: "Personal" }),
    "t",
    { agentsAlign: "top", agentsBackingColor: "#7b2fd0cc", agentsControlsColor: null },
  );
  const shared = memoryShared();
  createGroupStore(shared).save(groups);
  expect(
    createGroupStore(shared).load().groups,
    "the same groups, Agents settings included",
  ).toEqual(groups);
});
