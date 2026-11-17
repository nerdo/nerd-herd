import { describe, expect, test } from "bun:test";
import { placeMachine } from "../groups/groupActions";
import { computeRows, emptyGroups, m, make } from "../groups/groupFixtures";
import { defaultSettings } from "../settings/sidebarSettings";
import { isKeyCommand, type KeyState, keyStep } from "./keyStep";

// Work (open) holds desk-work; Personal (open, empty); ai-sandbox is ungrouped.
let saved = make(make(emptyGroups, "work", "Work"), "personal", "Personal");
saved = placeMachine(saved, "desk-work", "work");
const rows = computeRows(saved, [m("desk-work"), m("ai-sandbox")], defaultSettings);
const none: KeyState = { focused: null, cut: null };
const on = (focused: KeyState["focused"], cut: KeyState["cut"] = null): KeyState => ({
  focused,
  cut,
});
const work = { kind: "group", id: "work" } as const;
const personal = { kind: "group", id: "personal" } as const;
const deskWork = { kind: "machine", name: "desk-work" } as const;

describe("a key pressed in the Spaces mod", () => {
  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-enter-folds-the-focused-group@jj:261617da
  // "Then Work is folded"
  test("Enter folds the focused group", () => {
    expect(keyStep(on(work), rows, saved, "fold").effect).toEqual({
      kind: "command",
      command: 'group-fold:{"group":"work","folded":true}',
    });
  });

  // Statements gained from the spec's Keyboard use decision: "Arrow keys move between rows, Enter
  // folds and unfolds, F2 renames, … cut and paste move a row".
  test("Down with nothing focused focuses the first row", () => {
    expect(keyStep(none, rows, saved, "down").state.focused).toEqual(work);
  });

  test("Down moves focus to the next row", () => {
    expect(keyStep(on(work), rows, saved, "down").state.focused).toEqual(deskWork);
  });

  test("Up moves focus to the row before", () => {
    expect(keyStep(on(personal), rows, saved, "up").state.focused).toEqual(deskWork);
  });

  test("F2 on a group asks to rename it", () => {
    expect(keyStep(on(work), rows, saved, "rename").effect).toEqual({
      kind: "rename",
      group: "work",
    });
  });

  test("pasting a cut machine onto a group moves it into that group", () => {
    const cut = keyStep(on(deskWork), rows, saved, "cut").state;
    expect(keyStep({ ...cut, focused: personal }, rows, saved, "paste").effect).toEqual({
      kind: "command",
      command: 'machine-move:{"machine":"desk-work","group":"personal"}',
    });
  });

  test("pasting a cut group onto a group nests it there", () => {
    expect(keyStep(on(work, personal), rows, saved, "paste").effect).toEqual({
      kind: "command",
      command: 'group-move:{"group":"personal","parent":"work"}',
    });
  });

  test("pasting with nothing cut does nothing", () => {
    expect(keyStep(on(work), rows, saved, "paste").effect).toBeNull();
  });
});

describe("telling key commands apart", () => {
  // Statement gained with the key bindings: the mod's command loop receives key commands and
  // data commands alike, and only the key commands go to keyStep.
  test("the six key commands are key commands, and a data command is not", () => {
    expect(
      [
        "up",
        "down",
        "fold",
        "rename",
        "cut",
        "paste",
        'group-fold:{"group":"w","folded":true}',
      ].map(isKeyCommand),
    ).toEqual([true, true, true, true, true, true, false]);
  });
});
