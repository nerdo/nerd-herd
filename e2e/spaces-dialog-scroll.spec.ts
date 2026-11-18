// A dialog taller than the window shows that it scrolls (the user, 2026-11-18: "in dialogs the
// vertical scroll bar is never visible, but it does scroll. it's just not clear that it CAN scroll").
// In a 1200 by 634 window the group settings are taller than the window. The dialog spans x 349 to
// 852 of the screenshot, its fields stop at 812, and its scrollbar runs at 818 to 824 (read
// 2026-11-18), so the column from 814 to 830 holds only a scrollbar, whose thumb is one long
// unbroken run of pixels; text
// showing through gives only short runs (2026-11-18: a dialog that collapsed showed terminal text there).

import { expect, test } from "@playwright/test";
import { runLength } from "./support/window-pixels";
import { HerdrWindow } from "./support/herdr-window";

const window = new HerdrWindow();
const width = 1200;
const column = { from: 814 / width, to: 830 / width, top: 0.15, bottom: 0.85 };
let bar: number;
let fields: readonly string[];

test.beforeAll(() => {
  window.start({}, { width, height: 634 });
  window.act("group-make", { name: "Work" });
  window.act("open", { panel: "group-settings", group: "Work" });
  fields = window.readWindow();
  bar = runLength(window, "#ffffff", column);
  window.herdr("overlay.close", {});
});

test.afterAll(() => window.stop());

test("a group's settings, taller than the window, show their fields", () => {
  expect(fields.join("\n")).toContain("Banner link (https or a file path)");
});

test("a dialog taller than the window shows a scrollbar along its right edge", () => {
  expect(bar).toBeGreaterThan(40);
});
