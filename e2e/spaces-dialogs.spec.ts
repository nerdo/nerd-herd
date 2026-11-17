// The Spaces mod's dialogs and menu, opened with the mod's open command (what the cog wheels, the
// group menu, and any keys.json binding open) and read from the screen. Clicking needs the
// pointer, which the harness never drives, so what is checked here is what each one shows.

import { expect, test } from "@playwright/test";
import { HerdrWindow, type ScreenLines } from "./support/herdr-window";

const window = new HerdrWindow();
let spacesSettings: ScreenLines;
let overlays: unknown;
let groupSettings: ScreenLines;
let menu: ScreenLines;
let size: unknown;

/**
 * A dialog's whole text: dialogs open in the middle of the window, past the sidebar. The window is
 * shorter than the group settings (the user, 2026-11-17: "make the dialog walks scroll and read in
 * pieces"), so each dialog is read at its top and again after Page Down brings its end into view.
 * 634 points is the shortest window the person's tiling gave a walk; there the two pieces overlap.
 * A dialog more than about twice the window's height would lose its middle between them.
 */
const whole = (w: HerdrWindow) => w.readDialog();

test.beforeAll(() => {
  window.start({}, { width: 1200, height: 634 });
  window.act("group-make", { name: "Work" });
  window.act("open", { panel: "spaces-settings" });
  spacesSettings = whole(window);
  overlays = (window.ask("status") as { overlays?: unknown }).overlays;
  window.herdr("overlay.close", {});
  window.act("open", { panel: "group-settings", group: "Work" });
  groupSettings = whole(window);
  window.herdr("overlay.close", {});
  window.act("open", { panel: "menu", target: { kind: "group", group: "Work", name: "Work" } });
  menu = whole(window);
  window.herdr("overlay.close", {});
  size = window.windowSize();
});

test.afterAll(() => window.stop());

// The readings below mean "read in pieces" only in a window shorter than the group settings.
test("the walk's window is 1200 by 634 points, shorter than a group's settings", () => {
  expect(size).toEqual({ width: 1200, height: 634 });
});

// Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-the-cog-wheel-opens-spaces-settings@jj:261617da
test("Spaces settings open as one overlay of the Spaces mod", () => {
  expect(overlays).toEqual([expect.stringContaining("nerd-herd-spaces")]);
});

test("Spaces settings show the word for groups and the ungrouped header", () => {
  expect(spacesSettings.join("\n")).toMatch(
    /Spaces settings[\s\S]*Word for a group[\s\S]*Ungrouped header name/,
  );
});

// The user, 2026-11-17: indenting spaces under their machine is a setting that can be turned off.
test("Spaces settings show the choice of indented or flush spaces under a machine", () => {
  // Indented and Flush share one line, and the window is read in overlapping strips, so their order
  // in the reading is not fixed; the statement is that both are offered under the label.
  const below = spacesSettings.join("\n").split("Spaces under a machine")[1] ?? "";
  expect([below.includes("Indented"), below.includes("Flush")]).toEqual([true, true]);
});

// Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-a-group-s-cog-opens-that-group-s-settings@jj:261617da
test("a group's settings show its icon, banner links, clip side, sorts, and folded count", () => {
  // The text reader can drop the capital I of "Icon (an emoji)", a bare bar at the start of a line
  // (a 1200-point window, 2026-11-17: read as "con (an emoji)" while the capture shows "Icon").
  expect(groupSettings.join("\n")).toMatch(
    /Work settings[\s\S]*I?con \(an emoji\)[\s\S]*Banner link \(https or a file path\)[\s\S]*keep[\s\S]*Sort[\s\S]*Sort machines[\s\S]*Count shown when folded/,
  );
});

// Found on the 2026-11-17 hand look: the group settings ran taller than the dialog, hiding Save.
test("a group's settings show Cancel and Save, so changes can be kept", () => {
  // Cancel and Save share one row; the reader misses the white "Save" on its dark button when the
  // window opens large (2026-11-17), so the row's presence is read from Cancel.
  expect(groupSettings).toContain("Cancel");
});

// Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-right-clicking-a-group-header-opens-its-menu@jj:261617da
test("a group's menu lists Rename, Delete, Move to…, and Settings", () => {
  expect(menu.join("\n")).toMatch(/Rename[\s\S]*Delete[\s\S]*Move to[\s\S]*Settings/);
});
