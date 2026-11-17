// The test window starts without taking the keyboard (the user, 2026-11-17: "when the window is
// spawned, have it not steal focus. When i type as you test i'm constantly correcting typos").
// The app in front is read by its process ID (the person's own Herdr has the same name) with lsappinfo, macOS's launch services tool, every 0.1 s while the
// window starts and is sized: Herdr took the front for about 1.8 s and then gave it back
// (2026-11-17), so one reading after the start misses it.

import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { HerdrWindow } from "./support/herdr-window";

const window = new HerdrWindow();
const frontApp = (): string => {
  const asn = spawnSync("lsappinfo", ["front"], { encoding: "utf8" }).stdout.trim();
  const info = spawnSync("lsappinfo", ["info", "-only", "pid", asn], { encoding: "utf8" });
  return /pid"?\s*=\s*(\d+)/i.exec(info.stdout)?.[1] ?? "none";
};
let before: string;
let during: string[];

test.beforeAll(() => {
  before = frontApp();
  mkdirSync(test.info().outputDir, { recursive: true });
  const log = join(test.info().outputDir, "front.log");
  const sampler = spawn("sh", [
    "-c",
    `while :; do lsappinfo info -only pid "$(lsappinfo front)" >> '${log}'; sleep 0.1; done`,
  ]);
  window.start();
  sampler.kill();
  during = [...new Set(readFileSync(log, "utf8").match(/pid"?\s*=\s*\d+/gi) ?? [])].map(
    (n) => /(\d+)/.exec(n)?.[1] ?? "none",
  );
});

test.afterAll(() => window.stop());

test("starting the test window leaves the app that was in front, in front", () => {
  expect(during).toEqual([before]);
});
