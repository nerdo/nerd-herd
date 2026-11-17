// A banner read from a file on this computer (the user, 2026-11-17: "What if I have the banner on
// disk and it's not hosted anywhere?"), kept once loaded ("I think we should embed the images").
// The walk copies the repository's banner image to a file inside the home folder, where Herdr lets
// a mod read, sets the banner to that copy, then removes the copy and restarts Herdr.

import { copyFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { e2eSettings } from "./support/e2e-settings";
import { HerdrWindow, type ScreenLines } from "./support/herdr-window";

const window = new HerdrWindow();
const source = join(e2eSettings.shots, "..", "walk-banner.png");
let loaded: ScreenLines;
let afterRemoval: ScreenLines;
const shows = (lines: ScreenLines) => lines.join("\n").includes("WORK BANNER");

test.beforeAll(() => {
  copyFileSync(e2eSettings.bannerFixture, source);
  window.start();
  window.act("group-make", { name: "Work" });
  window.act("group-banner", { group: "Work", open: source });
  loaded = window.readUntil(shows);
  rmSync(source);
  window.restart();
  afterRemoval = window.readUntil(shows);
});

test.afterAll(() => {
  window.stop();
  rmSync(source, { force: true });
});

test("a banner named by a file path on this computer shows on its group", () => {
  expect(shows(loaded)).toBe(true);
});

test("after the banner's file is removed and Herdr restarts, the kept banner still shows", () => {
  expect(shows(afterRemoval), afterRemoval.join("\n")).toBe(true);
});
