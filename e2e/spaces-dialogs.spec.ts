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

/** The whole window's text: dialogs open in the middle of it, past the sidebar. */
const whole = (w: HerdrWindow) => w.readWindow();

test.beforeAll(() => {
  window.start();
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
});

test.afterAll(() => window.stop());

// Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-the-cog-wheel-opens-spaces-settings@jj:261617da
test("Spaces settings open as one overlay of the Spaces mod", () => {
  expect(overlays).toEqual([expect.stringContaining("nerd-herd-spaces")]);
});

test("Spaces settings show the word for groups and the ungrouped header", () => {
  expect(spacesSettings.join("\n")).toMatch(
    /Spaces settings[\s\S]*Word for a group[\s\S]*Ungrouped header name/,
  );
});

// Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-a-group-s-cog-opens-that-group-s-settings@jj:261617da
test("a group's settings show its icon, banner links, clip side, sorts, and folded count", () => {
  expect(groupSettings.join("\n")).toMatch(
    /Work settings[\s\S]*Icon[\s\S]*Banner link[\s\S]*keep[\s\S]*Sort[\s\S]*Sort machines[\s\S]*Count shown when folded/,
  );
});

// Found on the 2026-11-17 hand look: the group settings ran taller than the dialog, hiding Save.
test("a group's settings show Cancel and Save, so changes can be kept", () => {
  expect([groupSettings.includes("Cancel"), groupSettings.includes("Save")]).toEqual([true, true]);
});

// Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-right-clicking-a-group-header-opens-its-menu@jj:261617da
test("a group's menu lists Rename, Delete, Move to…, and Settings", () => {
  expect(menu.join("\n")).toMatch(/Rename[\s\S]*Delete[\s\S]*Move to[\s\S]*Settings/);
});
