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
});
