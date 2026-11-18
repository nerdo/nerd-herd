// A banner's overlay colors (the user, 2026-11-18: "add the ability to set the overlay color. Right
// now sometimes the color bleeds into the banner or doesn't work well with it"; asked which color:
// "both, with the ability to make the backing transparent, and ideally we should be able to preview
// it on top of the banner within the dialog before we save"). The backing fills the strip behind a
// banner's controls; the controls color draws the controls. The walk sends the commands the group
// settings dialog's Save sends, since the walks never move the person's pointer, and counts pixels
// of colors the gray banner fixture and Herdr's light theme never draw.

import { copyFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { e2eSettings } from "./support/e2e-settings";
import { colorCount } from "./support/window-pixels";
import { HerdrWindow } from "./support/herdr-window";

const window = new HerdrWindow();
const source = join(e2eSettings.shots, "..", "walk-overlay-banner.png");
const red = "#ff0000";
// Magenta: Herdr's status dots are green, and the banner fixture is gray.
const magenta = "#ff00ff";
const showsWork = (lines: readonly string[]) => lines.join("\n").includes("WORK BANNER");
let before: number;
let backed: number;
let beforeControls: number;
let controlled: number;
let restarted: number;
let preview: number;
let transparent: number;
let reset: number;

test.beforeAll(() => {
  copyFileSync(e2eSettings.bannerFixture, source);
  window.start();
  window.act("group-make", { name: "Work" });
  window.act("group-banner", { group: "Work", open: source });
  window.readUntil(showsWork);
  before = colorCount(window, red, "sidebar");
  window.act("group-set", { group: "Work", backingColor: red });
  backed = colorCount(window, red, "sidebar");
  beforeControls = colorCount(window, magenta, "sidebar", "tinted");
  window.act("group-set", { group: "Work", controlsColor: magenta });
  controlled = colorCount(window, magenta, "sidebar", "tinted");
  window.restart();
  window.readUntil(showsWork);
  restarted = colorCount(window, red, "sidebar");
  window.act("open", { panel: "group-settings", group: "Work" });
  preview = colorCount(window, red, "beyond");
  window.herdr("overlay.close", {});
  window.act("group-set", { group: "Work", backingColor: `${red}00` });
  transparent = colorCount(window, red, "sidebar");
  window.act("group-set", { group: "Work", backingColor: red });
  window.act("group-set", { group: "Work", backingColor: null });
  reset = colorCount(window, red, "sidebar");
});

test.afterAll(() => {
  window.stop();
  rmSync(source, { force: true });
});

// A strip 26 points tall across the banner holds thousands of pixels; a stray red pixel is not one.
const strip = 2000;

test("a banner with no backing color set draws no backing", () => {
  expect(before).toBe(0);
});

test("a group's backing color fills the strip behind the controls on its banner", () => {
  expect(backed).toBeGreaterThan(strip);
});

// The walk's sidebar also lists the person's real agents and spaces, whose colors vary, so the
// controls are counted against the same sidebar read just before their color was set.
test("a group's controls color draws the controls on its banner", () => {
  expect(controlled - beforeControls).toBeGreaterThan(20);
});

test("a group's backing color is still drawn after Herdr restarts", () => {
  expect(restarted).toBeGreaterThan(strip);
});

test("a group's settings dialog previews its backing color over the banner", () => {
  expect(preview).toBeGreaterThan(strip);
});

test("a fully transparent backing color draws no backing", () => {
  expect(transparent).toBe(0);
});

test("resetting a group's backing color puts back the banner with no backing", () => {
  expect(reset).toBe(0);
});
