// A banner link to a file Herdr does not let the mod read (2026-11-18: a /private/tmp link made
// Herdr's readFile throw, which ended the mod's command loop, so every later command did nothing,
// even after a restart). The link should fail like any other unreadable banner file: an error card
// under the group, with the mod still taking commands.

import { expect, test } from "@playwright/test";
import { HerdrWindow, type ScreenLines } from "./support/herdr-window";

const window = new HerdrWindow();
const outside = "/private/tmp/nerd-herd-walk-outside.png";
const card = "Couldn't read the banner file";
const has = (text: string) => (lines: ScreenLines) => lines.join("\n").includes(text);
let refused: ScreenLines;
let later: ScreenLines;
let restarted: ScreenLines;

test.beforeAll(() => {
  window.start();
  window.act("group-make", { name: "Work" });
  window.act("group-banner", { group: "Work", open: outside });
  refused = window.readUntil(has(card));
  window.act("group-make", { name: "Later" });
  later = window.readUntil(has("Later"));
  window.restart();
  window.act("group-make", { name: "Afterward" });
  restarted = window.readUntil(has("Afterward"));
});

test.afterAll(() => window.stop());

test("a banner file Herdr does not let the mod read shows the unreadable-file card", () => {
  expect(refused.join("\n")).toContain(card);
});

test("after such a banner link, the mod still takes the next command", () => {
  expect(later.join("\n")).toContain("Later");
});

test("after a restart with such a banner link saved, the mod still takes commands", () => {
  expect(restarted.join("\n")).toContain("Afterward");
});
