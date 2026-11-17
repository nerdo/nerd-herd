import { describe, expect, test } from "bun:test";
import { deleteGroup, placeMachine } from "./groupActions";
import {
  computeRows,
  defaultSettings,
  emptyGroups,
  labelOf,
  labels,
  m,
  make,
} from "./groupFixtures";

// Spec-driven bulk tests: each cites the spec case it was written from, pinned to the spec's revision.

describe("deleting a group", () => {
  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-deleting-a-group-returns-its-machines-to-the-ungrouped-list@jj:093e16ca
  // "The groups are Personal only, and the ungrouped machines below it are ai-sandbox and desk-home"
  test("deleting a group returns its machines to the ungrouped list", () => {
    let saved = make(make(emptyGroups, "personal", "Personal"), "scratch", "Scratch");
    saved = placeMachine(saved, "ai-sandbox", "scratch");
    const rows = computeRows(
      deleteGroup(saved, "scratch"),
      [m("ai-sandbox"), m("desk-home")],
      defaultSettings,
    );
    expect(labels(rows)).toEqual(["Personal", "ai-sandbox", "desk-home"]);
  });

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-deleting-a-group-lifts-its-subgroups-into-its-place@jj:093e16ca
  // "The top level holds Clients then Personal; Clients still holds ai-sandbox; desk-work is among the ungrouped machines"
  test("deleting a group lifts its subgroups into its place", () => {
    let saved = make(make(emptyGroups, "work", "Work"), "personal", "Personal");
    saved = make(saved, "clients", "Clients", "work");
    saved = placeMachine(placeMachine(saved, "ai-sandbox", "clients"), "desk-work", "work");
    const rows = computeRows(
      deleteGroup(saved, "work"),
      [m("ai-sandbox"), m("desk-work")],
      defaultSettings,
    );
    expect(rows.map((r) => ("depth" in r ? [labelOf(r), r.depth] : r.kind))).toEqual([
      ["Clients", 0],
      ["ai-sandbox", 1],
      ["Personal", 0],
      ["desk-work", 0],
    ]);
  });
});
