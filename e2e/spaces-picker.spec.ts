// The overlay color picker draws its square and bars (the user, 2026-11-18: "the picker rectangle
// is all just flat red so it's useless"). The walk opens a group's settings with the backing picker
// showing, which the swatch otherwise opens, since the walks never move the pointer. In a 1200 by
// 634 window the dialog spans x 349 to 852 (read 2026-11-18). The picker starts at hue 0, red: its
// square mixes red with white and black, and its hue bar holds green, which nothing else in the
// dialog draws. The dialog is read a step at a time, keeping the most each step showed.

import { expect, test } from "@playwright/test";
import { HerdrWindow } from "./support/herdr-window";
import { colorCount } from "./support/window-pixels";

const window = new HerdrWindow();
const width = 1200;
const dialog = { from: 360 / width, to: 840 / width };
let shades = 0;
let greens = 0;

test.beforeAll(() => {
  window.start({}, { width, height: 634 });
  window.act("group-make", { name: "Work" });
  window.act("open", { panel: "group-settings", group: "Work", picker: "backing" });
  for (let step = 0; step < 6; step++) {
    shades = Math.max(shades, colorCount(window, "#ff0000", dialog, "shaded"));
    greens = Math.max(greens, colorCount(window, "#00ff00", dialog, "tinted"));
    window.key("dialog-down");
  }
  window.herdr("overlay.close", {});
});

test.afterAll(() => window.stop());

test("the picker's square shades its hue from white to black", () => {
  expect(shades).toBeGreaterThan(500);
});

test("the picker's hue bar shows the hues, green among them", () => {
  expect(greens).toBeGreaterThan(20);
});
