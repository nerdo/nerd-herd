import { expect, test } from "bun:test";
import { arrangeSessions, type SessionInput } from "./sessionList";

const session = (o: Partial<SessionInput> & Pick<SessionInput, "terminal">): SessionInput => ({
  terminal: o.terminal,
  title: o.title ?? "Phone number collection",
  space: o.space ?? "sandbox",
  machine: o.machine ?? null,
  status: o.status ?? "idle",
  icon: o.icon ?? null,
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
