import { expect, test } from "bun:test";
import { groups, session } from "./sessionFixtures";
import { arrangeSessions } from "./sessionList";

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
    { kind: "folder", group: "g1", label: "Done", status: "done", count: 1 },
    {
      kind: "card",
      terminal: "ai-sandbox/t1",
      icon: null,
      title: "Release notes",
      place: "sandbox",
      machine: "ai-sandbox",
      status: "done",
    },
    { kind: "folder", group: "g1", label: "Idle", status: "idle", count: 1 },
    {
      kind: "card",
      terminal: "ai-sandbox/t2",
      icon: null,
      title: "Phone numbers",
      place: "sandbox",
      machine: "ai-sandbox",
      status: "idle",
    },
  ]);
});

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
      { kind: "folder", group: "work", label: "Idle", status: "idle", count: 1 },
      {
        kind: "card",
        terminal: "desk-work/t1",
        icon: null,
        title: "Deploy",
        place: "sandbox",
        machine: "desk-work",
        status: "idle",
      },
      { kind: "ungrouped", label: "Ungrouped" },
      { kind: "folder", group: null, label: "Idle", status: "idle", count: 1 },
      {
        kind: "card",
        terminal: "t9",
        icon: null,
        title: "Local notes",
        place: "sandbox",
        machine: "This computer",
        status: "idle",
      },
    ],
  );
});

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
