import { describe, expect, test } from "bun:test";
import { makeGroup, placeMachine, setSort } from "./groupActions";
import { computeRows, defaultSettings, emptyGroups, labels, local, m, make } from "./groupFixtures";
import type { SavedGroups } from "./groupModel";
import { levelOrderOf, placeItem, setLevelOrder } from "./levelOrder";

// The user, 2026-11-17: each level (a group's contents, or the top) keeps groups above machines by
// default. Dragging groups among groups or machines among machines keeps it so. Dropping one kind
// among the other switches that level to a custom order, exactly where things were dropped, and the
// level's settings can switch it back.

// The top holds Work then Personal, desk-work then ai-sandbox; This computer was never placed.
const start: SavedGroups = placeMachine(
  placeMachine(
    make(make(emptyGroups, "work", "Work"), "personal", "Personal"),
    "desk-work",
    null,
  ),
  "ai-sandbox",
  null,
);
const machines = [local, m("desk-work"), m("ai-sandbox")];
const top = (saved: SavedGroups, listed = machines, settings = defaultSettings) =>
  labels(computeRows(saved, listed, settings).filter((r) => !("depth" in r) || r.depth === 0));
const group = (id: string) => ({ kind: "group", id }) as const;
const machine = (name: string | null) => ({ kind: "machine", name }) as const;
// This computer dropped above Work: the hand walk's case.
const dropped = placeItem(start, null, machine(null), group("work"));

describe("the order of a level", () => {
  test("a machine placed before a group draws just before it, the rest keeping their drawn order", () => {
    expect(top(dropped)).toEqual([
      "This computer",
      "Work",
      "Personal",
      "desk-work",
      "ai-sandbox",
    ]);
  });

  test("placing a machine before a group switches a groups-first level to custom", () => {
    expect([levelOrderOf(start, null), levelOrderOf(dropped, null)]).toEqual([
      "groupsFirst",
      "custom",
    ]);
  });

  test("a group placed before a machine draws just before it", () => {
    const saved = placeItem(start, null, group("personal"), machine("ai-sandbox"));
    expect(top(saved)).toEqual([
      "Work",
      "desk-work",
      "Personal",
      "ai-sandbox",
      "This computer",
    ]);
  });

  test("in a custom level, a machine placed before a machine draws just before it", () => {
    const saved = placeItem(dropped, null, machine("ai-sandbox"), machine(null));
    expect(top(saved)).toEqual([
      "ai-sandbox",
      "This computer",
      "Work",
      "Personal",
      "desk-work",
    ]);
  });

  test("groups and machines missing from a custom order draw after it, groups first", () => {
    const saved = makeGroup(dropped, { id: "later", name: "Later", parent: null });
    expect(top(saved, [...machines, m("laptop")])).toEqual([
      "This computer",
      "Work",
      "Personal",
      "desk-work",
      "ai-sandbox",
      "Later",
      "laptop",
    ]);
  });

  test("in a custom level the A to Z sort does not apply", () => {
    const saved = setSort(dropped, null, "subgroups", "alphabetical");
    expect(top(saved)).toEqual([
      "This computer",
      "Work",
      "Personal",
      "desk-work",
      "ai-sandbox",
    ]);
  });

  test("a top level in custom order draws no ungrouped header", () => {
    const settings = { ...defaultSettings, ungroupedHeader: true };
    expect(top(dropped, machines, settings)).not.toContain(defaultSettings.ungroupedName);
  });

  test("switching a custom level back to groups first draws groups first, each kind in its custom order", () => {
    const custom = placeItem(dropped, null, machine("ai-sandbox"), machine(null));
    expect(top(setLevelOrder(custom, null, "groupsFirst"))).toEqual([
      "Work",
      "Personal",
      "ai-sandbox",
      "This computer",
      "desk-work",
    ]);
  });

  test("switching a level to custom keeps the order it was drawn in", () => {
    const sorted = setSort(start, null, "subgroups", "alphabetical");
    expect(top(setLevelOrder(sorted, null, "custom"))).toEqual(top(sorted));
  });

  test("switching a level to custom reads back as custom", () => {
    expect(levelOrderOf(setLevelOrder(start, null, "custom"), null)).toBe("custom");
  });

  test("a level inside a group switches to custom on its own, leaving the top groups first", () => {
    let saved = make(start, "clients", "Clients", "work");
    saved = placeMachine(saved, "desk-work", "work");
    saved = placeItem(saved, "work", machine("desk-work"), group("clients"));
    expect([levelOrderOf(saved, "work"), levelOrderOf(saved, null)]).toEqual([
      "custom",
      "groupsFirst",
    ]);
  });
});
