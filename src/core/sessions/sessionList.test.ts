import { expect, test } from "bun:test";
import { session } from "./sessionFixtures";
import { arrangeSessions } from "./sessionList";

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
    { kind: "section", label: "Idle", status: "idle", count: 2 },
    {
      kind: "card",
      terminal: "t1",
      icon: null,
      title: "Herdr-app jj mods",
      place: "sandbox",
      machine: "This computer",
      status: "idle",
    },
    {
      kind: "card",
      terminal: "frankenstein-nerdo/t3",
      icon: null,
      title: "NAS setup",
      place: "sandbox",
      machine: "frankenstein-nerdo",
      status: "idle",
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
    place: "ground-truth",
    machine: "This computer",
    status: "idle",
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
      place: "",
      machine: "ai-sandbox",
      status: "idle",
    },
  ]);
});

// Spec: docs/specs/finalized/nerd-herd-agents.html#test-case-grouped-by-group-puts-status-folders-inside-each-group@jj:14ab73a0
// "A Done session and an Idle session in spaces of the townsquare group, grouped by group: the
//  townsquare section holds a Done folder with the first card and an Idle folder with the second,
//  and the section has no Blocked or Working folder."

// Spec: docs/specs/finalized/nerd-herd-agents.html#test-case-a-nested-group-gets-its-own-section@jj:14ab73a0
// "The Clients group inside the Work group, with one session in each, grouped by group: there is
//  a Work section and a Clients section, and the Clients header names Work as the group it sits
//  inside."

// Spec: docs/specs/finalized/nerd-herd-agents.html#test-case-ungrouped-comes-after-the-groups@jj:14ab73a0
// "A session in a space that is in no group, grouped by group: its card is in an Ungrouped
//  section, after every group section."

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

// Spec: docs/specs/in-progress/executing-nerd-herd-agents.html#test-case-a-status-folder-carries-its-status-and-count@jj:607ab1aa
// "Two Idle sessions and one Done session, sorted by Priority: the Done section is marked done with
//  a count of 1, and the Idle section is marked idle with a count of 2."

test("sorted by Priority, each section names its status and how many sessions it holds", () => {
  const rows = arrangeSessions({
    sort: "priority",
    sessions: [
      session({ terminal: "t1" }),
      session({ terminal: "t2" }),
      session({ terminal: "t3", status: "done" }),
    ],
  });
  expect(
    rows.flatMap((r) => (r.kind === "section" ? [r] : [])),
    "Done with 1, Idle with 2",
  ).toEqual([
    { kind: "section", label: "Done", status: "done", count: 1 },
    { kind: "section", label: "Idle", status: "idle", count: 2 },
  ]);
});

// Spec: docs/specs/in-progress/executing-nerd-herd-agents.html#test-case-a-card-names-its-space-and-its-machine-apart@jj:607ab1aa
// "A session in ground-truth on ai-sandbox, sorted by Priority: the card's place is ground-truth
//  and its machine is ai-sandbox."

test("sorted by Priority, a card holds its space and its machine apart, with its status", () => {
  const [, card] = arrangeSessions({
    sort: "priority",
    sessions: [
      session({ terminal: "ai-sandbox/t2", space: "ground-truth", machine: "ai-sandbox" }),
    ],
  });
  expect(card, "place ground-truth, machine ai-sandbox, status idle").toMatchObject({
    place: "ground-truth",
    machine: "ai-sandbox",
    status: "idle",
  });
});

// Spec: docs/specs/in-progress/executing-nerd-herd-agents.html#test-case-the-focused-session-s-card-is-marked-focused@jj:607ab1aa
// "Two sessions, the second in the focused pane: the second card is marked focused and the first is not."
test("the card of the session in the focused pane is marked focused, and the others are not", () => {
  const rows = arrangeSessions({
    sort: "priority",
    sessions: [session({ terminal: "t1" }), session({ terminal: "t2", focused: true })],
  });
  expect(
    rows.flatMap((r) => (r.kind === "card" ? [[r.terminal, r.focused === true]] : [])),
    "t2 focused, t1 not",
  ).toEqual([
    ["t1", false],
    ["t2", true],
  ]);
});

// Spec: docs/specs/in-progress/executing-nerd-herd-agents.html#test-case-a-folded-status-section-shows-its-pill-alone@jj:607ab1aa
// "An Idle session and a Done session sorted by Priority, with Idle folded: the Idle section is its
//  pill alone, marked folded, and the Done section holds its card."
test("sorted by Priority, a folded Idle section shows its pill alone while Done keeps its card", () => {
  const rows = arrangeSessions({
    sort: "priority",
    sessions: [session({ terminal: "t1" }), session({ terminal: "t2", status: "done" })],
    foldedStatuses: ["idle"],
  });
  expect(
    rows.map((r) =>
      r.kind === "card"
        ? r.terminal
        : `${r.kind}:${"label" in r ? r.label : ""}${"folded" in r && r.folded ? ":folded" : ""}`,
    ),
    "Done with t2, then Idle folded and empty",
  ).toEqual(["section:Done", "t2", "section:Idle:folded"]);
});
