import { describe, expect, test } from "bun:test";
import { emptyGroups } from "../groups/groupModel";
import { computeRows } from "../groups/groupRows";
import { levelOrderOf } from "../groups/levelOrder";
import { defaultSettings } from "../settings/sidebarSettings";
import { applyCommand, type SpacesState } from "./applyCommand";

// The commands behind the user's rule of 2026-11-17: dropping one kind among the other places it
// exactly there, in a custom order, and the level's settings switch between that and groups first.
let next = 0;
const run = (state: SpacesState, ...commands: string[]) =>
  commands.reduce((s, c) => applyCommand(s, c, () => `g${++next}`), state);
// The top holds Work, Personal, alpha, beta.
const start = run(
  { groups: emptyGroups, settings: defaultSettings },
  'group-make:{"name":"Work"}',
  'group-make:{"name":"Personal"}',
  'machine-move:{"machine":"alpha","group":null}',
  'machine-move:{"machine":"beta","group":null}',
);
const listed = ["alpha", "beta", "gamma"].map((name) => ({ name, reachable: true }));
const top = (s: SpacesState) =>
  computeRows(s.groups, listed, s.settings).flatMap((r) =>
    "depth" in r && r.depth === 0
      ? [r.kind === "group" ? r.name : (r.name ?? "This computer")]
      : [],
  );
// beta dropped above Work: the top level is now custom.
const custom = run(start, 'machine-move:{"machine":"beta","group":null,"beforeGroup":"Work"}');

describe("commands that order a level", () => {
  test("machine-move with beforeGroup draws the machine just before that group", () => {
    expect(top(custom)).toEqual(["beta", "Work", "Personal", "alpha", "gamma"]);
  });

  test("group-move with beforeMachine draws the group just before that machine", () => {
    const s = run(start, 'group-move:{"group":"Personal","parent":null,"beforeMachine":"beta"}');
    expect(top(s)).toEqual(["Work", "alpha", "Personal", "beta", "gamma"]);
  });

  test("in a custom level, machine-move with before draws the machine just before that machine", () => {
    const s = run(custom, 'machine-move:{"machine":"alpha","group":null,"before":"beta"}');
    expect(top(s)).toEqual(["alpha", "beta", "Work", "Personal", "gamma"]);
  });

  test("in a custom level, group-move with before draws the group just before that group", () => {
    const s = run(custom, 'group-move:{"group":"Personal","parent":null,"before":"Work"}');
    expect(top(s)).toEqual(["beta", "Personal", "Work", "alpha", "gamma"]);
  });

  test("a machine moved into a custom level without before draws at its end", () => {
    const s = run(
      custom,
      'machine-move:{"machine":"gamma","group":"Work"}',
      'machine-move:{"machine":"gamma","group":null}',
    );
    expect(top(s)).toEqual(["beta", "Work", "Personal", "alpha", "gamma"]);
  });

  test("level-order with group null switches the top level to custom", () => {
    const s = run(start, 'level-order:{"group":null,"order":"custom"}');
    expect(levelOrderOf(s.groups, null)).toBe("custom");
  });

  test("level-order switches a custom level back to groups first", () => {
    const s = run(custom, 'level-order:{"group":null,"order":"groupsFirst"}');
    expect(top(s)).toEqual(["Work", "Personal", "beta", "alpha", "gamma"]);
  });
});
