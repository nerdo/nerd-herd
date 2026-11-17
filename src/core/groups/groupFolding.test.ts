import { describe, expect, test } from "bun:test";
import { placeMachine, setCountMode, setFolded } from "./groupActions";
import {
  computeRows,
  defaultSettings,
  emptyGroups,
  header,
  m,
  machinesOfNestedWork,
  make,
  nestedWork,
} from "./groupFixtures";

// Spec-driven bulk tests: each cites the spec case it was written from, pinned to the spec's revision.

describe("folding a group", () => {
  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-a-folded-group-shows-only-its-header@jj:093e16ca
  // "One row for Work showing Work and 1, and no rows for desk-work or its spaces"
  test("a folded group shows only its header", () => {
    let saved = placeMachine(make(emptyGroups, "work", "Work"), "desk-work", "work");
    saved = setFolded(saved, "work", true);
    const rows = computeRows(saved, [m("desk-work")], defaultSettings);
    expect(rows.map((r) => (r.kind === "group" ? [r.name, r.count] : r.kind))).toEqual([
      ["Work", 1],
    ]);
  });

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-a-folded-group-counts-every-machine-inside-by-default@jj:093e16ca
  // "Work's header row shows the count 3"
  test("a folded group counts every machine inside by default", () => {
    expect(
      header(computeRows(nestedWork(), machinesOfNestedWork, defaultSettings), "Work")?.count,
    ).toBe(3);
  });

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-a-folded-group-set-to-direct-machines-counts-only-those@jj:093e16ca
  // "Work's header row shows the count 1"
  test("a folded group set to direct machines counts only those", () => {
    const saved = setCountMode(nestedWork(), "work", "directMachines");
    expect(header(computeRows(saved, machinesOfNestedWork, defaultSettings), "Work")?.count).toBe(
      1,
    );
  });

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-a-folded-group-set-to-direct-items-counts-groups-and-machines@jj:093e16ca
  // "Work's header row shows the count 2"
  test("a folded group set to direct items counts groups and machines", () => {
    const saved = setCountMode(nestedWork(), "work", "directItems");
    expect(header(computeRows(saved, machinesOfNestedWork, defaultSettings), "Work")?.count).toBe(
      2,
    );
  });
});
