// Herdr's own Spaces features keep working inside a group (spec case "Herdr's Spaces features work
// inside a group"), for the parts the harness can drive with commands: showing a space, and
// narrowing the sidebar to its rail and back. Clicking and dragging need the pointer, which the
// harness never drives; dragging a space would also move it in the shared herdr-core.

import { expect, test } from "@playwright/test";
import { HerdrWindow, type ScreenLines } from "./support/herdr-window";

const window = new HerdrWindow();
let chosen: string;
let shownSpace: unknown;
let narrow: ScreenLines;
let wide: ScreenLines;

/** This computer's spaces from `herdr-app ls`, as ids. */
const localSpaces = (ls: unknown): string[] => {
  const spaces =
    typeof ls === "object" && ls !== null && "spaces" in ls && Array.isArray(ls.spaces)
      ? ls.spaces
      : [];
  return spaces.flatMap((s: unknown) =>
    typeof s === "object" &&
    s !== null &&
    "id" in s &&
    typeof s.id === "string" &&
    "machine" in s &&
    s.machine === null
      ? [s.id]
      : [],
  );
};
const field = (o: unknown, key: string): unknown =>
  typeof o === "object" && o !== null && key in o ? (o as Record<string, unknown>)[key] : undefined;

test.beforeAll(() => {
  window.start();
  window.act("group-make", { name: "Work" });
  window.act("machine-move", { machine: null, group: "Work" });
  const ids = localSpaces(window.ask("ls"));
  chosen = ids.find((id) => id !== field(window.ask("status"), "space")) ?? ids[0] ?? "";
  window.herdr("space.select", { id: chosen });
  shownSpace = field(window.ask("status"), "space");
  window.herdr("layout.resize", { id: "sidebar", px: 140 });
  narrow = window.read();
  window.herdr("layout.resize", { id: "sidebar", px: 268 });
  wide = window.read();
});

test.afterAll(() => window.stop());

test("showing a space under Work makes it the window's space", () => {
  expect(shownSpace).toBe(chosen);
});

test("narrowing the sidebar shows the rail, without the section titles", () => {
  expect(narrow.some((l) => l.includes("Spaces"))).toBe(false);
});

test("in the rail a group shows its icon only, without its name", () => {
  expect(narrow.some((l) => /(^|\s)Work(\s|$)/.test(l))).toBe(false);
});

test("widening the sidebar again shows Work holding This computer", () => {
  expect(wide.join("\n")).toMatch(/Work[\s\S]*This computer/);
});
