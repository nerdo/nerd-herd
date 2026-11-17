// Spaces indented under their machine (the user, 2026-11-17: "indent the machines under the name
// of the machines ... a setting (defaulted to on)"). The sidebar is read with on, the default, then
// with it off, by the command Spaces settings sends. The first space under This computer is compared
// between the two readings, by its own text.

import { expect, test } from "@playwright/test";
import { HerdrWindow, type PlacedLine } from "./support/herdr-window";

const window = new HerdrWindow();
let indented: readonly PlacedLine[];
let flat: readonly PlacedLine[];

test.beforeAll(() => {
  window.start();
  indented = window.readPlaced();
  window.act("settings-indent", { indent: false });
  flat = window.readPlaced();
});

test.afterAll(() => window.stop());

const machine = (lines: readonly PlacedLine[]) =>
  lines.find((l) => l.text.includes("This computer"));
const firstSpace = (lines: readonly PlacedLine[]) =>
  lines[lines.findIndex((l) => l.text.includes("This computer")) + 1];
/** The line holding the same space: found by the space's name, the longest word on the line. The
 *  rest of the line (a badge letter, a count such as "↑2") is the person's live state and can read
 *  differently from one capture to the next (2026-11-17: "a-project 12" in one reading only). */
const sameLine = (lines: readonly PlacedLine[], text: string | undefined) => {
  const name = (text ?? "").split(/\s+/).reduce((a, b) => (b.length > a.length ? b : a), "");
  return name ? lines.find((l) => l.text.split(/\s+/).includes(name)) : undefined;
};

test("with indentation on, a machine's first space starts at least 15 points further right than with it off", () => {
  const on = firstSpace(indented);
  const off = sameLine(flat, on?.text);
  expect(
    (on?.left ?? 0) - (off?.left ?? 1e9),
    `on: ${JSON.stringify(on)} off: ${JSON.stringify(off)}`,
  ).toBeGreaterThanOrEqual(15);
});

test("turning indentation off leaves the machine's name where it was", () => {
  const on = machine(indented)?.left ?? 0;
  const off = machine(flat)?.left ?? 1e9;
  expect(Math.abs(on - off)).toBeLessThan(3);
});
