// Dismissing a saved-data error card (the user, 2026-11-17: "add a dismiss button"; the option
// chosen was Dismiss hides the card and keeps the backup). Herdr starts with a backup that still
// cannot be read; data-dismiss sends what the card's Dismiss button does.

import { expect, test } from "@playwright/test";
import { HerdrWindow, type ScreenLines } from "./support/herdr-window";

const window = new HerdrWindow();
let before: ScreenLines;
let dismissed: ScreenLines;
let restarted: ScreenLines;

const hasCard = (lines: ScreenLines) => lines.some((l) => l.includes("could not be read"));

test.beforeAll(() => {
  window.start({
    "nerd-herd.groups.backup": {
      data: "still damaged",
      errorId: "8a9f6a5e-0000-4000-8000-000000000002",
      unixTimestamp: 1794000000,
    },
  });
  before = window.readUntil(hasCard);
  window.key("data-dismiss");
  dismissed = window.read();
  window.restart();
  restarted = window.read();
});

test.afterAll(() => window.stop());

test("before dismissing, the card shows", () => {
  expect(hasCard(before)).toBe(true);
});

test("dismissing removes the card from the sidebar", () => {
  expect(hasCard(dismissed), dismissed.join("\n")).toBe(false);
});

test("after Herdr restarts, the dismissed card stays gone", () => {
  expect(hasCard(restarted), restarted.join("\n")).toBe(false);
});
