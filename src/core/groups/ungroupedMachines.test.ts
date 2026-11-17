import { describe, expect, test } from "bun:test";
import { placeMachine } from "./groupActions";
import {
  computeRows,
  defaultSettings,
  emptyGroups,
  inside,
  labels,
  local,
  m,
  make,
} from "./groupFixtures";

// Spec-driven bulk tests: each cites the spec case it was written from, pinned to the spec's revision.

describe("the ungrouped machines", () => {
  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-with-no-groups-spaces-lists-machines-the-way-herdr-does@jj:093e16ca
  // "The machine rows are this computer, ai-sandbox, desk-work, with no header rows"
  test("with no groups, Spaces lists machines the way Herdr does", () => {
    expect(
      labels(
        computeRows(emptyGroups, [m("desk-work"), local, m("ai-sandbox")], defaultSettings),
      ),
    ).toEqual(["This computer", "ai-sandbox", "desk-work"]);
  });

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-an-unreachable-machine-keeps-its-group-place@jj:093e16ca
  // "laptop-travel is the second row inside Personal, marked unreachable"
  test("an unreachable machine keeps its group place", () => {
    let saved = make(emptyGroups, "personal", "Personal");
    saved = placeMachine(saved, "desk-home", "personal");
    saved = placeMachine(saved, "laptop-travel", "personal");
    const rows = computeRows(
      saved,
      [m("desk-home"), { name: "laptop-travel", reachable: false }],
      defaultSettings,
    );
    expect(inside(rows, "Personal")[1]).toEqual({
      kind: "machine",
      name: "laptop-travel",
      depth: 1,
      reachable: false,
    });
  });

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-ungrouped-machines-follow-the-groups-with-no-header-by-default@jj:093e16ca
  // "The rows after Personal's are ai-sandbox and its spaces, with no header row between"
  test("ungrouped machines follow the groups with no header by default", () => {
    const saved = placeMachine(
      make(emptyGroups, "personal", "Personal"),
      "desk-home",
      "personal",
    );
    const rows = computeRows(saved, [m("desk-home"), m("ai-sandbox")], defaultSettings);
    expect(labels(rows)).toEqual(["Personal", "desk-home", "ai-sandbox"]);
  });

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-ungrouped-machines-get-a-header-when-the-setting-is-on@jj:093e16ca
  // "One ungrouped header row comes after Personal's rows, followed by ai-sandbox and its spaces"
  test("ungrouped machines get a header when the setting is on", () => {
    const saved = placeMachine(
      make(emptyGroups, "personal", "Personal"),
      "desk-home",
      "personal",
    );
    const rows = computeRows(saved, [m("desk-home"), m("ai-sandbox")], {
      ...defaultSettings,
      ungroupedHeader: true,
    });
    expect(rows.map((r) => r.kind)).toEqual(["group", "machine", "ungrouped", "machine"]);
  });
});
