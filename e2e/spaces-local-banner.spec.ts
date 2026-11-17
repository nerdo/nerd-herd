// A banner read from a file on this computer (the user, 2026-11-17: "What if I have the banner on
// disk and it's not hosted anywhere?"). The banner names the repository's banner image by its
// absolute path, which is inside the home folder, where Herdr lets a mod read.

import { expect, test } from "@playwright/test";
import { e2eSettings } from "./support/e2e-settings";
import { HerdrWindow, type ScreenLines } from "./support/herdr-window";

const window = new HerdrWindow();
let sidebar: ScreenLines;

test.beforeAll(() => {
  window.start();
  window.act("group-make", { name: "Work" });
  window.act("group-banner", { group: "Work", open: e2eSettings.bannerFixture });
  sidebar = window.readUntil((lines) => lines.join("\n").includes("WORK BANNER"));
});

test.afterAll(() => window.stop());

test("a banner named by a file path on this computer shows on its group", () => {
  expect(sidebar.join("\n")).toContain("WORK BANNER");
});
