import { describe, expect, test } from "bun:test";
import { dropCommand } from "./dropCommand";
import { placeMachine } from "./groupActions";
import { emptyGroups, make } from "./groupFixtures";

// Work and Personal at the top; Clients inside Work; Personal holds desk-home then
// ai-sandbox; desk-work is ungrouped.
let saved = make(make(emptyGroups, "work", "Work"), "personal", "Personal");
saved = make(saved, "clients", "Clients", "work");
saved = placeMachine(
  placeMachine(saved, "desk-home", "personal"),
  "ai-sandbox",
  "personal",
);
saved = placeMachine(saved, "desk-work", null);
const group = (id: string) => ({ kind: "group", id }) as const;
const machine = (name: string) => ({ kind: "machine", name }) as const;
const cmd = (action: string, payload: unknown) => ({
  kind: "command" as const,
  command: `${action}:${JSON.stringify(payload)}`,
});

describe("dropping a dragged row", () => {
  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-dropping-a-machine-on-a-group-moves-it-in@jj:261617da
  test("a machine dropped onto a group moves into it", () => {
    expect(dropCommand(machine("desk-work"), group("work"), "onto", saved)).toEqual(
      cmd("machine-move", { machine: "desk-work", group: "work" }),
    );
  });

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-dropping-between-two-machines-reorders@jj:261617da
  test("a machine dropped on a machine goes before it, in that machine's group", () => {
    expect(
      dropCommand(machine("ai-sandbox"), machine("desk-home"), "before", saved),
    ).toEqual(
      cmd("machine-move", {
        machine: "ai-sandbox",
        group: "personal",
        before: "desk-home",
      }),
    );
  });

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-dropping-a-machine-below-the-groups-ungroups-it@jj:261617da
  test("a machine dropped on an ungrouped machine is ungrouped", () => {
    expect(dropCommand(machine("ai-sandbox"), machine("desk-work"), "onto", saved)).toEqual(
      cmd("machine-move", { machine: "ai-sandbox", group: null, before: "desk-work" }),
    );
  });

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-dropping-a-group-on-another-group-nests-it@jj:261617da
  test("a group dropped onto a group nests inside it", () => {
    expect(dropCommand(group("personal"), group("work"), "onto", saved)).toEqual(
      cmd("group-move", { group: "personal", parent: "work" }),
    );
  });

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-dropping-a-group-between-two-groups-reorders-them@jj:261617da
  test("a group dropped before a group moves beside it, ahead of it", () => {
    expect(dropCommand(group("personal"), group("work"), "before", saved)).toEqual(
      cmd("group-move", { group: "personal", parent: null, before: "work" }),
    );
  });

  // Found on the user's hand walk, 2026-11-17: dragging This computer above the Job group, with the
  // line drawn above Job, put it inside Job. The user's rule: a machine dropped among the groups
  // lands exactly there, at that group's level, which switches to a custom order.
  test("a machine dropped before a group goes just before it, at that group's level", () => {
    expect(dropCommand(machine("ai-sandbox"), group("clients"), "before", saved)).toEqual(
      cmd("machine-move", { machine: "ai-sandbox", group: "work", beforeGroup: "clients" }),
    );
  });

  test("a group dropped on a machine goes just before it, in that machine's group", () => {
    expect(dropCommand(group("clients"), machine("desk-work"), "onto", saved)).toEqual(
      cmd("group-move", { group: "clients", parent: null, beforeMachine: "desk-work" }),
    );
  });

  test("a row dropped on itself does nothing", () => {
    expect(dropCommand(group("work"), group("work"), "onto", saved)).toBeNull();
  });
});
