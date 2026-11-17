import { describe, expect, test } from "bun:test";
import { createGroupStore } from "../store/savedGroupStore";
import { computeRows, defaultSettings, emptyGroups, header, make } from "./groupFixtures";

// Spec-driven tests for a group's banner controls, pinned to the spec's revision.

describe("a group's banner controls", () => {
  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-a-new-group-shows-the-chevron-on-its-banner@jj:261617da
  // "Work's row says the chevron shows"
  test("a new group shows the chevron on its banner", () => {
    const rows = computeRows(make(emptyGroups, "work", "Work"), [], defaultSettings);
    expect(header(rows, "Work")?.chevron).toBe(true);
  });

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-a-new-group-places-its-banner-controls-in-the-middle@jj:261617da
  // "Work's row places its banner controls in the middle"
  test("a new group places its banner controls in the middle", () => {
    const rows = computeRows(make(emptyGroups, "work", "Work"), [], defaultSettings);
    expect(header(rows, "Work")?.align).toBe("middle");
  });

  // Statement gained with the 2026-11-17 decision: groups saved before these settings existed still
  // load, taking each new setting's default (spec: Banner as the group's row).
  test("a group saved before the banner control settings existed loads with their defaults", () => {
    const { chevron: _c, align: _a, ...older } = make(emptyGroups, "work", "Work").groups[0] ?? {};
    const store = createGroupStore({
      read: (key) => (key === "nerd-herd.groups" ? { ...emptyGroups, groups: [older] } : undefined),
      write: () => {},
    });
    const loaded = store.load();
    expect([
      loaded.problem,
      loaded.groups.groups[0]?.chevron,
      loaded.groups.groups[0]?.align,
    ]).toEqual([null, true, "middle"]);
  });
});
