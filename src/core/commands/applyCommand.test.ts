import { describe, expect, test } from "bun:test";
import { emptyGroups } from "../groups/groupModel";
import { defaultSettings } from "../settings/sidebarSettings";
import { applyCommand, CommandError, type SpacesState } from "./applyCommand";

// The mod's commands, as the spec's restart journey sends them (spec:
// docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-organizing-machines-survives-a-restart@jj:093e16ca
// and the Driving the mod note in its End-to-end test harness question).
const start: SpacesState = { groups: emptyGroups, settings: defaultSettings };
let next = 0;
const newId = () => `g${++next}`;
const run = (state: SpacesState, ...commands: string[]) =>
  commands.reduce((s, c) => applyCommand(s, c, newId), state);
const groupNamed = (s: SpacesState, name: string) => s.groups.groups.find((g) => g.name === name);

describe("applying a command", () => {
  test("settings-word sets the group word", () => {
    const s = run(start, 'settings-word:{"singular":"Environment","plural":"Environments"}');
    expect(s.settings.groupWord).toEqual({ singular: "Environment", plural: "Environments" });
  });

  test("group-make makes a group with its emoji icon", () => {
    const s = run(start, 'group-make:{"name":"Work","icon":"💼"}');
    expect([groupNamed(s, "Work")?.name, groupNamed(s, "Work")?.icon]).toEqual([
      "Work",
      { kind: "emoji", value: "💼" },
    ]);
  });

  test("group-make with a parent nests the new group in the named group", () => {
    const s = run(
      start,
      'group-make:{"name":"Work"}',
      'group-make:{"name":"Clients","parent":"Work"}',
    );
    expect(groupNamed(s, "Clients")?.parent).toBe(groupNamed(s, "Work")?.id ?? "missing");
  });

  test("group-banner sets the named group's open banner link", () => {
    const s = run(
      start,
      'group-make:{"name":"Work"}',
      'group-banner:{"group":"Work","open":"https://banners.example/work.png"}',
    );
    expect(groupNamed(s, "Work")?.openBanner).toBe("https://banners.example/work.png");
  });

  test("machine-move puts a machine in the named group, and null means this computer", () => {
    const s = run(
      start,
      'group-make:{"name":"Work"}',
      'machine-move:{"machine":"desk-work","group":"Work"}',
      'machine-move:{"machine":null,"group":"Work"}',
    );
    const work = groupNamed(s, "Work")?.id ?? "missing";
    expect(s.groups.placements).toEqual([
      { name: "desk-work", group: work },
      { name: null, group: work },
    ]);
  });

  test("sort-set with no group sets the top level's subgroup sort", () => {
    const s = run(start, 'sort-set:{"group":null,"subgroups":"alphabetical"}');
    expect(s.groups.topSubgroupSort).toBe("alphabetical");
  });

  test("group-fold folds the named group", () => {
    const s = run(start, 'group-make:{"name":"Work"}', 'group-fold:{"group":"Work","folded":true}');
    expect(groupNamed(s, "Work")?.folded).toBe(true);
  });

  test("a command whose payload is not the expected shape is refused with a report", () => {
    let caught: unknown;
    try {
      run(start, 'group-fold:{"group":42}');
    } catch (error) {
      caught = error;
    }
    expect([
      caught instanceof CommandError,
      caught instanceof CommandError && caught.userAction,
    ]).toEqual([true, "report"]);
  });

  // Statements gained from the spec's group menu (Rename, Delete, Move to…, Settings), group settings,
  // drag and drop, and Spaces settings: each reaches the sidebar as one of these commands.
  test("group-rename renames the named group", () => {
    const s = run(
      start,
      'group-make:{"name":"Work"}',
      'group-rename:{"group":"Work","name":"Job"}',
    );
    expect(s.groups.groups.map((g) => g.name)).toEqual(["Job"]);
  });

  test("group-delete deletes the named group", () => {
    const s = run(start, 'group-make:{"name":"Work"}', 'group-delete:{"group":"Work"}');
    expect(s.groups.groups).toEqual([]);
  });

  test("group-move nests the named group inside another", () => {
    const s = run(
      start,
      'group-make:{"name":"Work"}',
      'group-make:{"name":"Clients"}',
      'group-move:{"group":"Clients","parent":"Work"}',
    );
    expect(groupNamed(s, "Clients")?.parent).toBe(groupNamed(s, "Work")?.id ?? "missing");
  });

  test("group-move with before places the group ahead of that sibling", () => {
    const s = run(
      start,
      'group-make:{"name":"Work"}',
      'group-make:{"name":"Personal"}',
      'group-move:{"group":"Personal","parent":null,"before":"Work"}',
    );
    expect(s.groups.groups.map((g) => g.name)).toEqual(["Personal", "Work"]);
  });

  test("machine-move with before places the machine ahead of that machine", () => {
    const s = run(
      start,
      'machine-move:{"machine":"alpha","group":null}',
      'machine-move:{"machine":"beta","group":null,"before":"alpha"}',
    );
    expect(s.groups.placements.map((p) => p.name)).toEqual(["beta", "alpha"]);
  });

  test("group-set sets the options it names on the named group", () => {
    const s = run(
      start,
      'group-make:{"name":"Work"}',
      'group-set:{"group":"Work","icon":"💼","clip":"center","countMode":"directItems","chevron":false,"align":"bottom"}',
    );
    const w = groupNamed(s, "Work");
    expect([w?.icon, w?.clip, w?.countMode, w?.chevron, w?.align]).toEqual([
      { kind: "emoji", value: "💼" },
      "center",
      "directItems",
      false,
      "bottom",
    ]);
  });

  test("group-set with a null icon clears the group's icon", () => {
    const s = run(
      start,
      'group-make:{"name":"Work","icon":"💼"}',
      'group-set:{"group":"Work","icon":null}',
    );
    expect(groupNamed(s, "Work")?.icon).toBeNull();
  });

  test("settings-ungrouped turns the ungrouped header on and names it", () => {
    const s = run(start, 'settings-ungrouped:{"header":true,"name":"Unsorted"}');
    expect([s.settings.ungroupedHeader, s.settings.ungroupedName]).toEqual([true, "Unsorted"]);
  });
});
