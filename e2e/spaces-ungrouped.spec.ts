// The ungrouped header (spec case "Renaming the Ungrouped header"): turned on in Spaces settings it
// reads "Ungrouped", and renaming it the way a group is renamed changes what it reads. The commands
// are the ones Spaces settings and the rename dialog send; the harness never types into a dialog.

import { expect, test } from "@playwright/test";
import { HerdrWindow, type ScreenLines } from "./support/herdr-window";

const window = new HerdrWindow();
let shown: ScreenLines;
let renamed: ScreenLines;

test.beforeAll(() => {
  window.start();
  window.act("group-make", { name: "Work" });
  window.act("settings-ungrouped", { header: true });
  shown = window.read();
  window.act("settings-ungrouped", { name: "Unsorted" });
  renamed = window.read();
});

test.afterAll(() => window.stop());

test("turning the ungrouped header on shows Ungrouped below the groups", () => {
  expect(shown.join("\n")).toMatch(/Work[\s\S]*\nUngrouped/);
});

// Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-renaming-the-ungrouped-header@jj:261617da
test("renaming the ungrouped header shows its new name", () => {
  expect(renamed.join("\n")).toMatch(/Work[\s\S]*\nUnsorted/);
});
