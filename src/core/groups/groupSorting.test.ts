import { describe, expect, test } from "bun:test";
import { placeMachine, setSort } from "./groupActions";
import {
  computeRows,
  defaultSettings,
  emptyGroups,
  inside,
  labels,
  m,
  machinesOfMixedWork,
  make,
  mixedWork,
} from "./groupFixtures";

// Spec-driven bulk tests: each cites the spec case it was written from, pinned to the spec's revision.

describe("sorting groups and machines", () => {
  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-a-new-group-sorts-in-custom-order@jj:093e16ca
  // "Work's sort is custom"
  test("a new group sorts in custom order", () => {
    const work = make(emptyGroups, "work", "Work").groups[0];
    expect([work?.subgroupSort, work?.machineSort]).toEqual(["custom", "custom"]);
  });

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-a-group-lists-its-groups-before-its-machines@jj:093e16ca
  // "Work's rows list Archive, Clients, desk-client, desk-work in that order"
  test("a group lists its groups before its machines", () => {
    const saved = setSort(
      setSort(mixedWork(), "work", "subgroups", "alphabetical"),
      "work",
      "machines",
      "alphabetical",
    );
    expect(
      labels(inside(computeRows(saved, machinesOfMixedWork, defaultSettings), "Work")),
    ).toEqual(["Archive", "Clients", "desk-client", "desk-work"]);
  });

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-a-group-sorts-its-subgroups-and-machines-differently@jj:093e16ca
  // "Work's rows list Clients, Archive, desk-client, desk-work in that order"
  test("a group sorts its subgroups and machines differently", () => {
    const saved = setSort(mixedWork(), "work", "machines", "alphabetical");
    expect(
      labels(inside(computeRows(saved, machinesOfMixedWork, defaultSettings), "Work")),
    ).toEqual(["Clients", "Archive", "desk-client", "desk-work"]);
  });

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-setting-a-group-s-subgroup-sort-keeps-its-machine-sort@jj:093e16ca
  // "Work's subgroup sort is alphabetical and its machine sort is custom"
  test("setting a group's subgroup sort keeps its machine sort", () => {
    const work = setSort(make(emptyGroups, "work", "Work"), "work", "subgroups", "alphabetical")
      .groups[0];
    expect([work?.subgroupSort, work?.machineSort]).toEqual(["alphabetical", "custom"]);
  });

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-two-groups-keep-different-sorts@jj:093e16ca
  // "Personal's machines are ai-sandbox then desk-home, and Work's are desk-work then desk-client"
  test("two groups keep different sorts", () => {
    let saved = make(make(emptyGroups, "personal", "Personal"), "work", "Work");
    saved = placeMachine(
      placeMachine(saved, "desk-home", "personal"),
      "ai-sandbox",
      "personal",
    );
    saved = placeMachine(
      placeMachine(saved, "desk-work", "work"),
      "desk-client",
      "work",
    );
    saved = setSort(saved, "personal", "machines", "alphabetical");
    const rows = computeRows(
      saved,
      ["desk-home", "ai-sandbox", "desk-work", "desk-client"].map(m),
      defaultSettings,
    );
    expect([labels(inside(rows, "Personal")), labels(inside(rows, "Work"))]).toEqual([
      ["ai-sandbox", "desk-home"],
      ["desk-work", "desk-client"],
    ]);
  });

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-alphabetical-group-sort-orders-groups-by-name@jj:093e16ca
  // "The groups are Personal then Work, and each group's machines keep their custom order"
  test("alphabetical group sort orders groups by name", () => {
    let saved = make(make(emptyGroups, "work", "Work"), "personal", "Personal");
    saved = placeMachine(
      placeMachine(saved, "desk-work", "work"),
      "desk-client",
      "work",
    );
    saved = setSort(saved, null, "subgroups", "alphabetical");
    const rows = computeRows(
      saved,
      [m("desk-work"), m("desk-client")],
      defaultSettings,
    );
    expect(labels(rows)).toEqual(["Personal", "Work", "desk-work", "desk-client"]);
  });

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-reverse-alphabetical-group-sort-orders-groups-by-name-last-first@jj:093e16ca
  // "The groups are Work then Personal"
  test("reverse alphabetical group sort orders groups by name, last first", () => {
    const saved = setSort(
      make(make(emptyGroups, "personal", "Personal"), "work", "Work"),
      null,
      "subgroups",
      "reverseAlphabetical",
    );
    expect(labels(computeRows(saved, [], defaultSettings))).toEqual(["Work", "Personal"]);
  });
});
