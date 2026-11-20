import { expect, test } from "bun:test";
import { groups, session } from "./sessionFixtures";
import { type AgentsRow, arrangeSessions } from "./sessionList";

/** Each row as a short reading: a card by its terminal, a header by its kind and label. */
const read = (rows: readonly AgentsRow[]): string[] =>
  rows.map((r) =>
    r.kind === "card"
      ? r.terminal
      : `${r.kind}:${"label" in r ? r.label : r.name}${"count" in r && r.count !== undefined ? `:${r.count}` : ""}${"folded" in r && r.folded ? ":folded" : ""}`,
  );

// Spec: docs/specs/in-progress/executing-nerd-herd-agents.html#test-case-a-pinned-idle-session-sits-under-pinned-above-done
// "A Done session t1 and a pinned Idle session t2, sorted by Priority: the rows are the Pinned
//  section with a count of 1, the t2 card, the Done section, the t1 card; there is no Idle section."
test("sorted by Priority, a pinned Idle session sits under Pinned above Done, and Idle is gone", () => {
  const rows = arrangeSessions({
    sort: "priority",
    sessions: [
      session({ terminal: "t1", status: "done" }),
      session({ terminal: "t2", pinned: true }),
    ],
  });
  expect(read(rows), "Pinned with t2, then Done with t1").toEqual([
    "section:Pinned:1",
    "t2",
    "section:Done:1",
    "t1",
  ]);
});

// Spec: docs/specs/in-progress/executing-nerd-herd-agents.html#test-case-grouped-by-group-a-pinned-session-sits-under-pinned-above-every-group
// "Two Done sessions on a machine in the Work group, the second pinned, grouped by group: the rows
//  open with the Pinned section and the pinned card, then the Work section whose Done folder holds
//  the other card with a count of 1."
test("grouped by group, a pinned session sits under Pinned above every group, and leaves its group", () => {
  const rows = arrangeSessions({
    sort: "groups",
    groups: groups([{ id: "work", name: "Work", machines: ["desk-work"] }]),
    sessions: [
      session({ terminal: "desk-work/t1", status: "done", machine: "desk-work" }),
      session({ terminal: "desk-work/t2", status: "done", machine: "desk-work", pinned: true }),
    ],
  });
  expect(read(rows), "Pinned with t2, then Work's Done folder with t1").toEqual([
    "section:Pinned:1",
    "desk-work/t2",
    "group:Work",
    "folder:Done:1",
    "desk-work/t1",
  ]);
});

// Spec: docs/specs/in-progress/executing-nerd-herd-agents.html#test-case-a-folded-pinned-section-shows-its-pill-alone
// "A pinned session, with Pinned folded: the Pinned section is its pill alone, marked folded, with a
//  count of 1."
test("a folded Pinned section shows its pill alone, with its count", () => {
  const rows = arrangeSessions({
    sort: "priority",
    sessions: [session({ terminal: "t1", pinned: true })],
    foldedStatuses: ["pinned"],
  });
  expect(read(rows), "the Pinned pill alone, folded").toEqual(["section:Pinned:1:folded"]);
});
