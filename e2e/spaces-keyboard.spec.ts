// The Spaces mod's keys, driven the way Herdr delivers them: each key's keys.json binding sends
// "nerd-herd-spaces.<key>" to the mod (spec: Keyboard use; the harness never presses real keys).

import { expect, test } from "@playwright/test";
import { HerdrWindow, type MachineName, type ScreenLines } from "./support/herdr-window";

const window = new HerdrWindow();
let machine: MachineName;
let beforeKeys: ScreenLines;
let afterKeys: ScreenLines;

test.beforeAll(() => {
  machine = window.remoteMachine();
  window.start();
  window.act("group-make", { name: "Work" });
  window.act("machine-move", { machine, group: "Work" });
  beforeKeys = window.read();
  window.key("down");
  window.key("fold");
  afterKeys = window.read();
});

test.afterAll(() => window.stop());

/** The Spaces section's lines: those above the Agents heading, which also names machines. */
const spaces = (lines: ScreenLines) => lines.slice(0, Math.max(0, lines.indexOf("Agents")));

test("pressing Down then Enter folds the first group, hiding its machine", () => {
  expect([
    spaces(beforeKeys).some((l) => l.includes(String(machine))),
    spaces(afterKeys).some((l) => l.includes(String(machine))),
  ]).toEqual([true, false]);
});
