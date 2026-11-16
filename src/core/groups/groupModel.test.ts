import { describe, expect, test } from "bun:test";
import { defaultSettings } from "../settings/sidebarSettings";
import {
  deleteGroup,
  makeGroup,
  nestGroup,
  placeMachine,
  renameGroup,
  setBanner,
  setCountMode,
  setFolded,
  setIcon,
  setSort,
} from "./groupActions";
import {
  emptyGroups,
  type GroupId,
  GroupNameError,
  type Machine,
  type SavedGroups,
  type SpacesRow,
} from "./groupModel";
import { computeRows } from "./groupRows";

// Spec-driven bulk tests: each cites the spec case it was written from, pinned to the spec's revision.

const local: Machine = { name: null, reachable: true };
const m = (name: string): Machine => ({ name, reachable: true });
const make = (saved: SavedGroups, id: GroupId, name: string, parent: GroupId | null = null) =>
  makeGroup(saved, { id, name, parent });
const labelOf = (r: SpacesRow): string =>
  r.kind === "machine" ? (r.name ?? "This computer") : r.name;
const labels = (rows: readonly SpacesRow[]) => rows.map(labelOf);
const header = (rows: readonly SpacesRow[], name: string) =>
  rows.find(
    (r): r is Extract<SpacesRow, { kind: "group" }> => r.kind === "group" && r.name === name,
  );
/** The rows directly inside the named group (one level deeper), in drawn order. */
const inside = (rows: readonly SpacesRow[], name: string): SpacesRow[] => {
  const at = rows.findIndex((r) => r.kind === "group" && r.name === name);
  const own = rows[at];
  if (at < 0 || !own || own.kind !== "group") return [];
  const out: SpacesRow[] = [];
  for (const r of rows.slice(at + 1)) {
    if (!("depth" in r) || r.depth <= own.depth) break;
    if (r.depth === own.depth + 1) out.push(r);
  }
  return out;
};
const thrown = (act: () => unknown): GroupNameError | undefined => {
  try {
    act();
  } catch (error) {
    if (error instanceof GroupNameError) return error;
    throw error;
  }
  return undefined;
};
/** Work holds desk-work and Clients; Clients holds ai-sandbox and desk-client; Work is folded. */
const nestedWork = () => {
  let saved = make(make(emptyGroups, "work", "Work"), "clients", "Clients", "work");
  saved = placeMachine(saved, "desk-work", "work");
  saved = placeMachine(
    placeMachine(saved, "ai-sandbox", "clients"),
    "desk-client",
    "clients",
  );
  return setFolded(saved, "work", true);
};
const machinesOfNestedWork = ["desk-work", "ai-sandbox", "desk-client"].map(m);
/** Work holds, in custom order, desk-work, Clients, desk-client, Archive. */
const mixedWork = () => {
  let saved = make(emptyGroups, "work", "Work");
  saved = placeMachine(saved, "desk-work", "work");
  saved = make(saved, "clients", "Clients", "work");
  saved = placeMachine(saved, "desk-client", "work");
  return make(saved, "archive", "Archive", "work");
};
const machinesOfMixedWork = ["desk-work", "desk-client"].map(m);
const twoBanners = () =>
  setBanner(
    setBanner(
      make(emptyGroups, "work", "Work"),
      "work",
      "open",
      "https://banners.example/open.png",
    ),
    "work",
    "folded",
    "https://banners.example/folded.png",
  );

describe("group model", () => {
  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-nesting-a-group-inside-its-own-subgroup-changes-nothing@jj:093e16ca
  // "The saved groups equal the saved groups before the action: Work at the top level, holding Clients"
  test("nesting a group inside its own subgroup changes nothing", () => {
    const before = make(make(emptyGroups, "work", "Work"), "clients", "Clients", "work");
    expect(nestGroup(before, "work", "clients")).toEqual(before);
  });

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-an-empty-group-name-is-refused@jj:093e16ca
  // "It throws a group-name error with userAction fix and reason empty, and the saved groups are unchanged"
  test("an empty group name is refused", () => {
    const error = thrown(() => makeGroup(emptyGroups, { id: "work", name: "   " }));
    expect([error instanceof GroupNameError, error?.userAction, error?.reason]).toEqual([
      true,
      "fix",
      "empty",
    ]);
  });

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-a-61-character-group-name-is-refused@jj:093e16ca
  // "It throws a group-name error with userAction fix, reason too long, limit 60, and length 61, and the saved groups are unchanged"
  test("a 61-character group name is refused", () => {
    const error = thrown(() => makeGroup(emptyGroups, { id: "work", name: "x".repeat(61) }));
    expect([error?.userAction, error?.reason, error?.limit, error?.length]).toEqual([
      "fix",
      "tooLong",
      60,
      61,
    ]);
  });

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

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-a-new-group-starts-empty@jj:093e16ca
  // "One group named Work with zero machines"
  test("a new group starts empty", () => {
    const rows = computeRows(make(emptyGroups, "work", "Work"), [], defaultSettings);
    expect(rows.map((r) => (r.kind === "group" ? [r.name, r.count] : r.kind))).toEqual([
      ["Work", 0],
    ]);
  });

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

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-deleting-a-group-returns-its-machines-to-the-ungrouped-list@jj:093e16ca
  // "The groups are Personal only, and the ungrouped machines below it are ai-sandbox and desk-home"
  test("deleting a group returns its machines to the ungrouped list", () => {
    let saved = make(make(emptyGroups, "personal", "Personal"), "scratch", "Scratch");
    saved = placeMachine(saved, "ai-sandbox", "scratch");
    const rows = computeRows(
      deleteGroup(saved, "scratch"),
      [m("ai-sandbox"), m("desk-home")],
      defaultSettings,
    );
    expect(labels(rows)).toEqual(["Personal", "ai-sandbox", "desk-home"]);
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

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-a-new-group-sorts-in-custom-order@jj:093e16ca
  // "Work's sort is custom"
  test("a new group sorts in custom order", () => {
    const work = make(emptyGroups, "work", "Work").groups[0];
    expect([work?.subgroupSort, work?.machineSort]).toEqual(["custom", "custom"]);
  });

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-dropping-a-machine-on-a-group-moves-it-in@jj:093e16ca
  // "Work's rows are desk-work followed by its spaces"
  test("dropping a machine on a group moves it in", () => {
    const saved = placeMachine(make(emptyGroups, "work", "Work"), "desk-work", "work");
    expect(
      labels(inside(computeRows(saved, [m("desk-work")], defaultSettings), "Work")),
    ).toEqual(["desk-work"]);
  });

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-renaming-a-group-keeps-its-contents@jj:093e16ca
  // "The group with Work's id is named Job and still holds desk-work and Clients"
  test("renaming a group keeps its contents", () => {
    let saved = make(make(emptyGroups, "work", "Work"), "clients", "Clients", "work");
    saved = renameGroup(placeMachine(saved, "desk-work", "work"), "work", "Job");
    expect(
      labels(inside(computeRows(saved, [m("desk-work")], defaultSettings), "Job")),
    ).toEqual(["Clients", "desk-work"]);
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

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-deleting-a-group-lifts-its-subgroups-into-its-place@jj:093e16ca
  // "The top level holds Clients then Personal; Clients still holds ai-sandbox; desk-work is among the ungrouped machines"
  test("deleting a group lifts its subgroups into its place", () => {
    let saved = make(make(emptyGroups, "work", "Work"), "personal", "Personal");
    saved = make(saved, "clients", "Clients", "work");
    saved = placeMachine(placeMachine(saved, "ai-sandbox", "clients"), "desk-work", "work");
    const rows = computeRows(
      deleteGroup(saved, "work"),
      [m("ai-sandbox"), m("desk-work")],
      defaultSettings,
    );
    expect(rows.map((r) => ("depth" in r ? [labelOf(r), r.depth] : r.kind))).toEqual([
      ["Clients", 0],
      ["ai-sandbox", 1],
      ["Personal", 0],
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

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-a-group-header-carries-its-icon-and-banner@jj:093e16ca
  // "Work's header row carries that icon and that banner"
  test("a group header carries its icon and banner", () => {
    let saved = make(emptyGroups, "work", "Work");
    saved = setBanner(
      setIcon(saved, "work", { kind: "emoji", value: "💼" }),
      "work",
      "open",
      "https://banners.example/work.png",
    );
    const row = header(computeRows(saved, [], defaultSettings), "Work");
    expect([row?.icon?.value, row?.banner]).toEqual(["💼", "https://banners.example/work.png"]);
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

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-a-single-banner-shows-in-both-states@jj:093e16ca
  // "Work's header row carries the open banner"
  test("a single banner shows in both states", () => {
    const saved = setFolded(
      setBanner(
        make(emptyGroups, "work", "Work"),
        "work",
        "open",
        "https://banners.example/open.png",
      ),
      "work",
      true,
    );
    expect(header(computeRows(saved, [], defaultSettings), "Work")?.banner).toBe(
      "https://banners.example/open.png",
    );
  });

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-a-folded-group-with-two-banners-shows-its-folded-banner@jj:093e16ca
  // "Work's header row carries the folded banner"
  test("a folded group with two banners shows its folded banner", () => {
    const saved = setFolded(twoBanners(), "work", true);
    expect(header(computeRows(saved, [], defaultSettings), "Work")?.banner).toBe(
      "https://banners.example/folded.png",
    );
  });

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-an-open-group-with-two-banners-shows-its-open-banner@jj:093e16ca
  // "Work's header row carries the open banner"
  test("an open group with two banners shows its open banner", () => {
    expect(header(computeRows(twoBanners(), [], defaultSettings), "Work")?.banner).toBe(
      "https://banners.example/open.png",
    );
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
