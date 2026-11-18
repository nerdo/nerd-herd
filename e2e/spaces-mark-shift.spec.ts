// A marked row keeps its place (the user, 2026-11-18: "when the current group is highlighted
// sometimes and i mouse over it, the banner moves down and to the right by a pixel ... The image
// shift needs to be fixed"). Keyboard focus draws the same outline a hover drop target draws, and the
// walk gives a banner focus with the mod's Down key, since the walks never move the pointer. The
// banner fixture's background is #cccccc, so its top-left corner is where that gray first appears.

import { copyFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { e2eSettings } from "./support/e2e-settings";
import { HerdrWindow } from "./support/herdr-window";
import type { ColorEdge } from "./support/pixels";

const window = new HerdrWindow();
const source = join(e2eSettings.shots, "..", "walk-mark-banner.png");
const gray = "#cccccc";
let unmarked: ColorEdge | null;
let focused: ColorEdge | null;

test.beforeAll(() => {
  copyFileSync(e2eSettings.bannerFixture, source);
  window.start();
  window.act("group-make", { name: "Work" });
  window.act("group-banner", { group: "Work", open: source });
  window.readUntil((lines) => lines.join("\n").includes("WORK BANNER"));
  unmarked = window.colorEdge(gray);
  window.key("down");
  focused = window.colorEdge(gray);
});

test.afterAll(() => {
  window.stop();
  rmSync(source, { force: true });
});

test("a banner keeps its place when its group is marked", () => {
  expect(focused).toEqual(unmarked);
});
