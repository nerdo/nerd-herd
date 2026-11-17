// Damaged saved groups (spec expectation "Damaged saved groups are kept as a backup and Spaces shows
// Herdr's usual list with an error card"): Herdr starts with saved groups no nerd-herd version wrote.

import { expect, test } from "@playwright/test";
import { HerdrWindow, type ScreenLines } from "./support/herdr-window";

const window = new HerdrWindow();
let first: ScreenLines;
let later: ScreenLines;

test.beforeAll(() => {
  window.start({ "nerd-herd.groups": { groups: "not a list" } });
  first = window.readUntil((lines) => lines.some((l) => l.includes("could not be read")));
  window.act("sort-set", { group: null, machines: "custom" });
  later = window.read();
});

test.afterAll(() => window.stop());

test("damaged saved groups show an error card saying they could not be read", () => {
  expect(first.join("\n")).toMatch(/could not be read/);
});

test("the error card stays after the sidebar redraws", () => {
  expect(later.join("\n")).toMatch(/could not be read/);
});

test("with the saved groups damaged, Spaces lists This computer first, as Herdr does", () => {
  const spaces = first.slice(
    0,
    Math.max(
      0,
      first.findIndex((l) => /^Agents\b/.test(l)),
    ),
  );
  expect(spaces.find((l) => /This computer|^\S*\s?desk|sandbox/.test(l))).toMatch(
    /This computer/,
  );
});
