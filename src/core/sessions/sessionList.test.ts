import { expect, test } from "bun:test";
import { emptyGroups, type SavedGroups } from "../groups/groupModel";
import { arrangeSessions, type SessionInput } from "./sessionList";

const session = (o: Partial<SessionInput> & Pick<SessionInput, "terminal">): SessionInput => ({
  terminal: o.terminal,
  title: o.title ?? "Phone number collection",
  space: o.space ?? "sandbox",
  machine: o.machine ?? null,
  status: o.status ?? "idle",
  icon: o.icon ?? null,
  tabName: o.tabName ?? null,
});

// Spec: docs/specs/finalized/nerd-herd-agents.html#test-case-priority-sections-hold-cards-that-name-space-and-machine@jj:14ab73a0
// "Two sessions in spaces called sandbox, one on this computer and one on frankenstein-nerdo, both
//  Idle: sorted by Priority, both cards sit in the Idle section, one reading 'sandbox · This
//  computer' and the other 'sandbox · frankenstein-nerdo' after its title."
test("sorted by Priority, two Idle sessions sit in the Idle section, each card naming its space and machine", () => {
  const rows = arrangeSessions({
    sort: "priority",
    sessions: [
      session({ terminal: "t1", title: "Herdr-app jj mods" }),
      session({
        terminal: "frankenstein-nerdo/t3",
        title: "NAS setup",
        machine: "frankenstein-nerdo",
      }),
    ],
  });
  expect(rows, "one Idle section holding both cards, located by space and machine").toEqual([
    { kind: "section", label: "Idle" },
    {
      kind: "card",
      terminal: "t1",
      icon: null,
      title: "Herdr-app jj mods",
      location: "sandbox · This computer",
    },
    {
      kind: "card",
      terminal: "frankenstein-nerdo/t3",
      icon: null,
      title: "NAS setup",
      location: "sandbox · frankenstein-nerdo",
    },
  ]);
});

// Spec: docs/specs/finalized/nerd-herd-agents.html#test-case-an-unknown-sort-value-counts-as-priority@jj:14ab73a0
// "agents.sort holds 'by-machine', written by some other mod: the cards sit in the Priority
//  sections, as with priority."
test("a sort value other than priority, grouped or groups arranges the sessions as Priority does", () => {
  const sessions = [
    session({ terminal: "t1", title: "Herdr-app jj mods" }),
    session({ terminal: "t2", title: "NAS setup", status: "done" }),
  ];
  expect(
    arrangeSessions({ sort: "by-machine", sessions }),
    "the same rows as sort = priority",
  ).toEqual(arrangeSessions({ sort: "priority", sessions }));
});

// Spec: docs/specs/finalized/nerd-herd-agents.html#test-case-a-card-leads-with-the-icon-and-the-title@jj:14ab73a0
// "A Claude session titled 'Phone number collection' in ground-truth: the card's parts in order
//  are the Claude icon, 'Phone number collection' in bold, then the location text." The list
//  carries the icon on the card; the view draws icon, title, location in that order.
test("a session's card carries its agent's icon beside its title", () => {
  const rows = arrangeSessions({
    sort: "priority",
    sessions: [
      session({
        terminal: "t4",
        space: "ground-truth",
        icon: { path: "icons/claude.svg", tint: false },
      }),
    ],
  });
  expect(rows[1], "the card holds the Claude icon").toEqual({
    kind: "card",
    terminal: "t4",
    icon: { path: "icons/claude.svg", tint: false },
    title: "Phone number collection",
    location: "ground-truth · This computer",
  });
});

// Spec: docs/specs/finalized/nerd-herd-agents.html#test-case-a-session-card-carries-the-whole-subject@jj:14ab73a0
// "An agent whose title is 'π 🧵 THRD: Reset leader election': the card's subject is
//  'π 🧵 THRD: Reset leader election', with no characters dropped."
test("a card carries the session's whole subject, every character kept", () => {
  const [, card] = arrangeSessions({
    sort: "priority",
    sessions: [session({ terminal: "t1y", title: "π 🧵 THRD: Reset leader election" })],
  });
  expect(card, "the card's title is the full subject").toMatchObject({
    title: "π 🧵 THRD: Reset leader election",
  });
});

// Spec: docs/specs/finalized/nerd-herd-agents.html#test-case-grouped-by-space-cards-name-only-their-machine@jj:14ab73a0
// "A session in ground-truth on ai-sandbox, grouped by space: the card follows the ground-truth
//  section header, and its location text is 'ai-sandbox'."
test("grouped by space, a card sits under its space's section and names only its machine", () => {
  const rows = arrangeSessions({
    sort: "grouped",
    sessions: [
      session({ terminal: "ai-sandbox/t2", space: "ground-truth", machine: "ai-sandbox" }),
    ],
  });
  expect(rows, "the ground-truth section, then the card located on ai-sandbox").toEqual([
    { kind: "section", label: "ground-truth" },
    {
      kind: "card",
      terminal: "ai-sandbox/t2",
      icon: null,
      title: "Phone number collection",
      location: "ai-sandbox",
    },
  ]);
});

/** Saved groups holding `group` with machines placed in it; other machines are ungrouped. */
const groups = (
  list: readonly { id: string; name: string; parent?: string; machines?: readonly string[] }[],
): SavedGroups => ({
  ...emptyGroups,
  groups: list.map((g) => ({
    id: g.id,
    name: g.name,
    parent: g.parent ?? null,
    icon: null,
    openBanner: null,
    foldedBanner: null,
    clip: "left",
    folded: false,
    subgroupSort: "custom",
    machineSort: "custom",
    countMode: "allMachines",
    chevron: true,
    align: "middle",
    backingColor: null,
    controlsColor: null,
  })),
  placements: list.flatMap((g) => (g.machines ?? []).map((name) => ({ name, group: g.id }))),
});

// Spec: docs/specs/finalized/nerd-herd-agents.html#test-case-grouped-by-group-puts-status-folders-inside-each-group@jj:14ab73a0
// "A Done session and an Idle session in spaces of the townsquare group, grouped by group: the
//  townsquare section holds a Done folder with the first card and an Idle folder with the second,
//  and the section has no Blocked or Working folder."
test("grouped by group, a group's section holds a Done folder and an Idle folder with their cards", () => {
  const rows = arrangeSessions({
    sort: "groups",
    groups: groups([{ id: "g1", name: "townsquare", machines: ["ai-sandbox"] }]),
    sessions: [
      session({
        terminal: "ai-sandbox/t1",
        title: "Release notes",
        status: "done",
        machine: "ai-sandbox",
      }),
      session({
        terminal: "ai-sandbox/t2",
        title: "Phone numbers",
        status: "idle",
        machine: "ai-sandbox",
      }),
    ],
  });
  expect(rows, "townsquare, then Done with the first card, then Idle with the second").toEqual([
    { kind: "group", id: "g1", name: "townsquare", inside: null },
    { kind: "folder", group: "g1", label: "Done" },
    {
      kind: "card",
      terminal: "ai-sandbox/t1",
      icon: null,
      title: "Release notes",
      location: "sandbox · ai-sandbox",
    },
    { kind: "folder", group: "g1", label: "Idle" },
    {
      kind: "card",
      terminal: "ai-sandbox/t2",
      icon: null,
      title: "Phone numbers",
      location: "sandbox · ai-sandbox",
    },
  ]);
});

// Spec: docs/specs/finalized/nerd-herd-agents.html#test-case-a-nested-group-gets-its-own-section@jj:14ab73a0
// "The Clients group inside the Work group, with one session in each, grouped by group: there is
//  a Work section and a Clients section, and the Clients header names Work as the group it sits
//  inside."
test("grouped by group, a group inside another gets its own section naming the group it sits in", () => {
  const rows = arrangeSessions({
    sort: "groups",
    groups: groups([
      { id: "work", name: "Work", machines: ["desk-work"] },
      { id: "clients", name: "Clients", parent: "work", machines: ["desk-client"] },
    ]),
    sessions: [
      session({ terminal: "desk-work/t1", machine: "desk-work" }),
      session({ terminal: "desk-client/t1", machine: "desk-client" }),
    ],
  });
  expect(
    rows.filter((r) => r.kind === "group"),
    "a Work section, then a Clients section inside Work",
  ).toEqual([
    { kind: "group", id: "work", name: "Work", inside: null },
    { kind: "group", id: "clients", name: "Clients", inside: "Work" },
  ]);
});

// Spec: docs/specs/finalized/nerd-herd-agents.html#test-case-ungrouped-comes-after-the-groups@jj:14ab73a0
// "A session in a space that is in no group, grouped by group: its card is in an Ungrouped
//  section, after every group section."
test("grouped by group, a session on a machine in no group sits in an Ungrouped section after the groups", () => {
  const rows = arrangeSessions({
    sort: "groups",
    groups: groups([{ id: "work", name: "Work", machines: ["desk-work"] }]),
    sessions: [
      session({ terminal: "t9", title: "Local notes" }),
      session({ terminal: "desk-work/t1", title: "Deploy", machine: "desk-work" }),
    ],
  });
  expect(rows, "Work's section first, then Ungrouped holding the session on this computer").toEqual(
    [
      { kind: "group", id: "work", name: "Work", inside: null },
      { kind: "folder", group: "work", label: "Idle" },
      {
        kind: "card",
        terminal: "desk-work/t1",
        icon: null,
        title: "Deploy",
        location: "sandbox · desk-work",
      },
      { kind: "ungrouped", label: "Ungrouped" },
      { kind: "folder", group: null, label: "Idle" },
      {
        kind: "card",
        terminal: "t9",
        icon: null,
        title: "Local notes",
        location: "sandbox · This computer",
      },
    ],
  );
});

// Spec: docs/specs/finalized/nerd-herd-agents.html#sec-ambiguity-resolution@jj:14ab73a0
// "Herdr's Agents section already labels each row from its tab name when the tab is named, so
//  renaming a session means renaming its tab"; the skeleton journey: after renaming a session
//  from its card, Dannel "sees the new name in the card".
test("a session whose tab someone named shows the tab's name as its card title", () => {
  const [, card] = arrangeSessions({
    sort: "priority",
    sessions: [
      session({
        terminal: "t1",
        title: "THRD: Reset leader election",
        tabName: "NAS drive health",
      }),
    ],
  });
  expect(card, "the card's title is the tab's name").toMatchObject({ title: "NAS drive health" });
});

// Spec: docs/specs/finalized/nerd-herd-agents.html#test-case-folding-in-agents-does-not-fold-spaces@jj:14ab73a0
// "The Work group open in Spaces: when Dannel folds the Work section in Agents, the Work section in
//  Agents is folded." Agents' own fold state is an input of its own, apart from Spaces' fold.
test("grouped by group, a group folded in Agents shows its section header, folded, without its folders", () => {
  const rows = arrangeSessions({
    sort: "groups",
    groups: groups([{ id: "work", name: "Work", machines: ["desk-work"] }]),
    sessions: [session({ terminal: "desk-work/t1", machine: "desk-work" })],
    folded: ["work"],
  });
  expect(rows, "only Work's header, marked folded").toEqual([
    { kind: "group", id: "work", name: "Work", inside: null, folded: true },
  ]);
});
