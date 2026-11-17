import { describe, expect, test } from "bun:test";
import { nestGroup, placeMachine } from "./groupActions";
import {
  computeRows,
  defaultSettings,
  emptyGroups,
  inside,
  labelOf,
  labels,
  local,
  m,
  make,
} from "./groupFixtures";

// Spec-driven bulk tests: each cites the spec case it was written from, pinned to the spec's revision.

describe("moving machines and groups", () => {
  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-nesting-a-group-inside-its-own-subgroup-changes-nothing@jj:093e16ca
  // "The saved groups equal the saved groups before the action: Work at the top level, holding Clients"
  test("nesting a group inside its own subgroup changes nothing", () => {
    const before = make(make(emptyGroups, "work", "Work"), "clients", "Clients", "work");
    expect(nestGroup(before, "work", "clients")).toEqual(before);
  });

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-a-new-group-starts-empty@jj:093e16ca
  // "One group named Work with zero machines"
  test("a new group starts empty", () => {
    const rows = computeRows(make(emptyGroups, "work", "Work"), [], defaultSettings);
    expect(rows.map((r) => (r.kind === "group" ? [r.name, r.count] : r.kind))).toEqual([
      ["Work", 0],
    ]);
  });

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-dropping-a-machine-on-a-group-moves-it-in@jj:093e16ca
  // "Work's rows are desk-work followed by its spaces"
  test("dropping a machine on a group moves it in", () => {
    const saved = placeMachine(make(emptyGroups, "work", "Work"), "desk-work", "work");
    expect(
      labels(inside(computeRows(saved, [m("desk-work")], defaultSettings), "Work")),
    ).toEqual(["desk-work"]);
  });

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-a-nested-group-moves-back-to-the-top-level@jj:093e16ca
  // "The top level holds Work then Clients, and Work no longer holds Clients"
  test("a nested group moves back to the top level", () => {
    const saved = nestGroup(
      make(make(emptyGroups, "work", "Work"), "clients", "Clients", "work"),
      "clients",
      null,
      { after: "work" },
    );
    expect(
      computeRows(saved, [], defaultSettings).map((r) =>
        r.kind === "group" ? [r.name, r.depth] : r.kind,
      ),
    ).toEqual([
      ["Work", 0],
      ["Clients", 0],
    ]);
  });

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-dropping-a-group-between-two-groups-reorders-them@jj:093e16ca
  // "The top level holds Work, Archive, Personal"
  test("dropping a group between two groups reorders them", () => {
    let saved = make(
      make(make(emptyGroups, "work", "Work"), "personal", "Personal"),
      "archive",
      "Archive",
    );
    saved = nestGroup(saved, "archive", null, { before: "personal" });
    expect(labels(computeRows(saved, [], defaultSettings))).toEqual([
      "Work",
      "Archive",
      "Personal",
    ]);
  });

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-dropping-a-machine-below-the-groups-ungroups-it@jj:093e16ca
  // "Work holds no machines, and desk-work is among the ungrouped machines"
  test("dropping a machine below the groups ungroups it", () => {
    const saved = placeMachine(
      placeMachine(make(emptyGroups, "work", "Work"), "desk-work", "work"),
      "desk-work",
      null,
    );
    expect(
      computeRows(saved, [m("desk-work")], defaultSettings).map((r) =>
        "depth" in r ? [labelOf(r), r.depth] : r.kind,
      ),
    ).toEqual([
      ["Work", 0],
      ["desk-work", 0],
    ]);
  });

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-pasting-a-cut-machine-onto-a-group-moves-it-in@jj:093e16ca
  // "Personal holds desk-work, Work holds no machines, and nothing is cut any more"
  test("pasting a cut machine onto a group moves it in", () => {
    let saved = make(make(emptyGroups, "work", "Work"), "personal", "Personal");
    saved = placeMachine(
      placeMachine(saved, "desk-work", "work"),
      "desk-work",
      "personal",
    );
    expect(
      labels(inside(computeRows(saved, [m("desk-work")], defaultSettings), "Personal")),
    ).toEqual(["desk-work"]);
  });

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-pasting-a-cut-group-into-its-own-subgroup-changes-nothing@jj:093e16ca
  // "The saved groups equal the saved groups before the action, and Work is still cut"
  test("pasting a cut group into its own subgroup changes nothing", () => {
    const before = make(make(emptyGroups, "work", "Work"), "clients", "Clients", "work");
    expect(nestGroup(before, "work", "clients")).toEqual(before);
  });

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-dropping-between-two-machines-reorders@jj:093e16ca
  // "Personal's machines are ai-sandbox then desk-home"
  test("dropping between two machines reorders", () => {
    let saved = make(emptyGroups, "personal", "Personal");
    saved = placeMachine(
      placeMachine(saved, "desk-home", "personal"),
      "ai-sandbox",
      "personal",
    );
    saved = placeMachine(saved, "ai-sandbox", "personal", "desk-home");
    expect(
      labels(
        inside(
          computeRows(saved, [m("desk-home"), m("ai-sandbox")], defaultSettings),
          "Personal",
        ),
      ),
    ).toEqual(["ai-sandbox", "desk-home"]);
  });

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-this-computer-moves-into-a-group@jj:093e16ca
  // "Personal's machines are desk-home then this computer"
  test("this computer moves into a group", () => {
    let saved = placeMachine(
      make(emptyGroups, "personal", "Personal"),
      "desk-home",
      "personal",
    );
    saved = placeMachine(saved, null, "personal");
    expect(
      labels(
        inside(computeRows(saved, [local, m("desk-home")], defaultSettings), "Personal"),
      ),
    ).toEqual(["desk-home", "This computer"]);
  });

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-dropping-a-group-on-another-group-nests-it@jj:093e16ca
  // "The top level holds Work only; Work holds Clients; Clients still holds desk-work"
  test("dropping a group on another group nests it", () => {
    let saved = make(make(emptyGroups, "work", "Work"), "clients", "Clients");
    saved = nestGroup(placeMachine(saved, "desk-work", "clients"), "clients", "work");
    expect(
      computeRows(saved, [m("desk-work")], defaultSettings).map((r) =>
        "depth" in r ? [labelOf(r), r.depth] : r.kind,
      ),
    ).toEqual([
      ["Work", 0],
      ["Clients", 1],
      ["desk-work", 2],
    ]);
  });
});
