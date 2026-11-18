// Damaged saved groups (spec expectation "Damaged saved groups are kept as a backup and Spaces shows
// Herdr's usual list with an error card"): Herdr starts with saved groups no nerd-herd version wrote.

import { expect, test } from "@playwright/test";
import { HerdrWindow, type ScreenLines } from "./support/herdr-window";

const window = new HerdrWindow();
let first: ScreenLines;
let later: ScreenLines;
let remote: string;

test.beforeAll(() => {
  remote = window.remoteMachine();
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

/** The card's text: from its message to its Try again button. */
const card = (lines: ScreenLines) => {
  const from = lines.findIndex((l) => l.includes("could not be read"));
  const to = lines.findIndex((l, i) => i >= from && l.includes("Try again"));
  return from < 0 || to < 0 ? [] : lines.slice(from, to + 1);
};

// Statement from the user, 2026-11-17: the card's reference id kept changing on every redraw.
test("the error card reads the same after the sidebar redraws, reference included", () => {
  expect([card(first).length > 0, card(later)]).toEqual([true, card(first)]);
});

test("the error card offers Try again", () => {
  expect(card(first).at(-1)).toContain("Try again");
});

test("with the saved groups damaged, Spaces lists This computer first, as Herdr does", () => {
  const spaces = first.slice(
    0,
    Math.max(
      0,
      first.findIndex((l) => /^Agents\b/.test(l)),
    ),
  );
  // A machine row is This computer or a remote machine, found by the start of its name (the text
  // reader can cut a long name short).
  const machineRow = (l: string) => l.includes("This computer") || l.includes(remote.slice(0, 8));
  expect(spaces.find(machineRow)).toMatch(
    /This computer/,
  );
});
