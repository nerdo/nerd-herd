import { describe, expect, test } from "bun:test";
import { emptyGroups } from "../groups/groupModel";
import { computeRows } from "../groups/groupRows";
import { defaultSettings } from "../settings/sidebarSettings";
import { applyCommand, type SpacesState } from "./applyCommand";

// The user's hand walk, 2026-11-17: "When the user manually moves something, it needs to change to
// custom and honor the move." A move to a place (before a row) in a level sorted A to Z or Z to A
// switches that sort to custom, keeping the order the level showed, with the moved row where it was
// dropped. A move into a group, with no place, keeps the group's sort.
let next = 0;
const run = (state: SpacesState, ...commands: string[]) =>
  commands.reduce((s, c) => applyCommand(s, c, () => `g${++next}`), state);
const listed = ["alpha", "beta", "gamma", "delta"].map((name) => ({ name, reachable: true }));
const rows = (s: SpacesState) => computeRows(s.groups, listed, s.settings);
const names = (s: SpacesState, depth: number) =>
  rows(s).flatMap((r) =>
    "depth" in r && r.depth === depth ? [r.kind === "group" ? r.name : (r.name ?? "")] : [],
  );
const groupNamed = (s: SpacesState, name: string) => s.groups.groups.find((g) => g.name === name);

// Work holds gamma, alpha, beta (placed in that order), shown A to Z: alpha, beta, gamma.
const machines = run(
  { groups: emptyGroups, settings: defaultSettings },
  'group-make:{"name":"Work"}',
  'machine-move:{"machine":"gamma","group":"Work"}',
  'machine-move:{"machine":"alpha","group":"Work"}',
  'machine-move:{"machine":"beta","group":"Work"}',
  'sort-set:{"group":"Work","machines":"alphabetical"}',
);
// The top holds Zeta, Alpha, Mid (made in that order), shown A to Z: Alpha, Mid, Zeta.
const groups = run(
  { groups: emptyGroups, settings: defaultSettings },
  'group-make:{"name":"Zeta"}',
  'group-make:{"name":"Alpha"}',
  'group-make:{"name":"Mid"}',
  'sort-set:{"group":null,"subgroups":"alphabetical"}',
);

describe("a manual move in a sorted level", () => {
  const movedBeta = run(
    machines,
    'machine-move:{"machine":"beta","group":"Work","before":"alpha"}',
  );

  test("moving a machine before another switches the level's machine sort to custom", () => {
    expect(groupNamed(movedBeta, "Work")?.machineSort).toBe("custom");
  });

  test("a machine moved before another shows just before it, the rest in the order they showed", () => {
    expect(names(movedBeta, 1)).toEqual(["beta", "alpha", "gamma"]);
  });

  const movedMid = run(groups, 'group-move:{"group":"Mid","parent":null,"before":"Alpha"}');

  test("moving a group before another switches the level's group sort to custom", () => {
    expect(movedMid.groups.topSubgroupSort).toBe("custom");
  });

  test("a group moved before another shows just before it, the rest in the order they showed", () => {
    const topGroups = rows(movedMid).flatMap((r) =>
      r.kind === "group" && r.depth === 0 ? [r.name] : [],
    );
    expect(topGroups).toEqual(["Mid", "Alpha", "Zeta"]);
  });

  test("a machine moved into a sorted group with no place keeps that group's sort", () => {
    const s = run(machines, 'machine-move:{"machine":"delta","group":"Work"}');
    expect(groupNamed(s, "Work")?.machineSort).toBe("alphabetical");
  });
});
