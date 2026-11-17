import { describe, expect, test } from "bun:test";
import { makeGroup, placeMachine, renameGroup } from "./groupActions";
import {
  computeRows,
  defaultSettings,
  emptyGroups,
  inside,
  labels,
  m,
  make,
  thrown,
} from "./groupFixtures";
import { GroupNameError } from "./groupModel";

// Spec-driven bulk tests: each cites the spec case it was written from, pinned to the spec's revision.

describe("naming a group", () => {
  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-an-empty-group-name-is-refused@jj:093e16ca
  // "It throws a group-name error with userAction fix and reason empty, and the saved groups are unchanged"
  test("an empty group name is refused", () => {
    const error = thrown(() => makeGroup(emptyGroups, { id: "work", name: "   " }));
    expect([error instanceof GroupNameError, error?.userAction, error?.reason]).toEqual([
      true,
      "fix",
      "empty",
    ]);
  });

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-a-61-character-group-name-is-refused@jj:093e16ca
  // "It throws a group-name error with userAction fix, reason too long, limit 60, and length 61, and the saved groups are unchanged"
  test("a 61-character group name is refused", () => {
    const error = thrown(() => makeGroup(emptyGroups, { id: "work", name: "x".repeat(61) }));
    expect([error?.userAction, error?.reason, error?.limit, error?.length]).toEqual([
      "fix",
      "tooLong",
      60,
      61,
    ]);
  });

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-renaming-a-group-keeps-its-contents@jj:093e16ca
  // "The group with Work's id is named Job and still holds desk-work and Clients"
  test("renaming a group keeps its contents", () => {
    let saved = make(make(emptyGroups, "work", "Work"), "clients", "Clients", "work");
    saved = renameGroup(placeMachine(saved, "desk-work", "work"), "work", "Job");
    expect(
      labels(inside(computeRows(saved, [m("desk-work")], defaultSettings), "Job")),
    ).toEqual(["Clients", "desk-work"]);
  });
});
