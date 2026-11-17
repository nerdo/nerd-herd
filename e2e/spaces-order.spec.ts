// A machine dropped above a group stays there (the user's hand walk, 2026-11-17: This computer
// dragged above Job landed inside it). machine-move with beforeGroup is what that drop sends; the
// drag itself needs the pointer, which the harness never drives.

import { expect, test } from "@playwright/test";
import { HerdrWindow, type ScreenLines } from "./support/herdr-window";

const window = new HerdrWindow();
let sidebar: ScreenLines;

test.beforeAll(() => {
  window.start();
  window.act("group-make", { name: "Work" });
  window.act("machine-move", { machine: null, group: null, beforeGroup: "Work" });
  window.restart();
  sidebar = window.read();
});

test.afterAll(() => window.stop());

test("This computer placed above a group is drawn above it after Herdr restarts", () => {
  const at = (text: string) => sidebar.findIndex((l) => l.includes(text));
  expect([at("This computer") >= 0, at("This computer") < at("Work")], sidebar.join("\n")).toEqual([
    true,
    true,
  ]);
});
