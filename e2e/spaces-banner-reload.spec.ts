// Reloading a group's banners (the user, 2026-11-17: "Add a reload button, and make it clear in the
// settings dialog how images work (that they're embedded, and that if it changes it needs to be
// reloaded)"). A banner is copied into nerd-herd once; Reload copies each of the group's banner
// links again. The walk sends the command the dialog's Reload button sends, since the walks never
// move the person's pointer.

import { copyFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { e2eSettings } from "./support/e2e-settings";
import { HerdrWindow, type ScreenLines } from "./support/herdr-window";

const window = new HerdrWindow();
const source = join(e2eSettings.shots, "..", "walk-reload-banner.png");
const homeFixture = join(e2eSettings.bannerFixture, "..", "home-banner.png");
let unchanged: ScreenLines;
let reloaded: ScreenLines;
let failedReload: ScreenLines;
const showsWork = (lines: ScreenLines) => lines.join("\n").includes("WORK BANNER");
const showsHome = (lines: ScreenLines) => lines.join("\n").includes("HOME BANNER");

test.beforeAll(() => {
  copyFileSync(e2eSettings.bannerFixture, source);
  window.start();
  window.act("group-make", { name: "Work" });
  window.act("group-banner", { group: "Work", open: source });
  window.readUntil(showsWork);
  // The file now holds another image; saving the same link keeps the copy already taken. Herdr
  // restarts before the reading, so the image comes from the kept copy rather than from the copy
  // this session drew earlier (a control run, 2026-11-17, passed with the kept copy dropped).
  copyFileSync(homeFixture, source);
  window.act("group-banner", { group: "Work", open: source });
  window.restart();
  unchanged = window.readUntil(showsWork);
  window.act("banner-reload", { group: "Work" });
  reloaded = window.readUntil(showsHome);
  // A reload that cannot read the file.
  rmSync(source);
  window.act("banner-reload", { group: "Work" });
  failedReload = window.read();
});

test.afterAll(() => {
  window.stop();
  rmSync(source, { force: true });
});

test("saving the same banner link after its file changed keeps showing the copy taken before", () => {
  expect(showsWork(unchanged), unchanged.join("\n")).toBe(true);
});

test("reloading a group's banners shows the new image at its link", () => {
  expect(showsHome(reloaded), reloaded.join("\n")).toBe(true);
});

test("a reload that cannot read the banner's file keeps showing the copy it had", () => {
  expect(showsHome(failedReload), failedReload.join("\n")).toBe(true);
});
