import { describe, expect, test } from "bun:test";
import { SavedDataError } from "../errors/savedDataError";
import { makeGroup, placeMachine, setFolded, setIcon } from "../groups/groupActions";
import { emptyGroups } from "../groups/groupModel";
import { createGroupStore, type SharedState } from "./savedGroupStore";

/** Herdr's shared state, kept in memory. */
const memoryShared = (start: Record<string, unknown> = {}) => {
  const values = new Map(Object.entries(start));
  const shared: SharedState = {
    read: (key) => values.get(key),
    write: (key, value) => values.set(key, value),
  };
  return { shared, values };
};

describe("saved group store", () => {
  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-saved-groups-read-back-after-a-restart@jj:093e16ca
  // "The read groups equal the written groups"
  test("saved groups read back after a restart", () => {
    let groups = makeGroup(makeGroup(emptyGroups, { id: "work", name: "Work" }), {
      id: "personal",
      name: "Personal",
    });
    groups = placeMachine(groups, "desk-work", "work");
    groups = placeMachine(
      placeMachine(groups, "ai-sandbox", "personal"),
      "desk-home",
      "personal",
    );
    groups = setIcon(setFolded(groups, "work", true), "work", { kind: "emoji", value: "💼" });
    const { shared } = memoryShared();
    createGroupStore(shared).save(groups);
    expect(createGroupStore(shared).load().groups).toEqual(groups);
  });

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-unreadable-saved-groups-are-backed-up-and-reset@jj:093e16ca
  // "It returns no groups, the backup key holds "not groups", and it reports a saved-groups error with userAction report"
  test("unreadable saved groups are backed up and reset", () => {
    const { shared, values } = memoryShared({ "nerd-herd.groups": "not groups" });
    const read = createGroupStore(shared).load();
    expect([
      read.groups,
      values.get("nerd-herd.groups.backup"),
      read.problem instanceof SavedDataError,
      read.problem?.userAction,
    ]).toEqual([emptyGroups, "not groups", true, "report"]);
  });

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-with-no-groups-spaces-lists-machines-the-way-herdr-does@jj:093e16ca
  // A first start has nothing saved: no groups, and nothing to report.
  test("nothing saved reads as no groups and no problem", () => {
    const read = createGroupStore(memoryShared().shared).load();
    expect([read.groups, read.problem]).toEqual([emptyGroups, null]);
  });
});
