// Trying again on backed-up saved groups (the user, 2026-11-17: the error card "should stay there
// and we should have a button in it to re-attempt reading the configs"). Herdr starts with a
// backup that can be read now, as after a hand fix; Try again sends what the card's button does.

import { expect, test } from "@playwright/test";
import { HerdrWindow, type ScreenLines } from "./support/herdr-window";

const window = new HerdrWindow();
let before: ScreenLines;
let after: ScreenLines;

const work = {
  id: "01M7N0000000000000000WORK0",
  name: "Recovered",
  parent: null,
  icon: null,
  openBanner: null,
  foldedBanner: null,
  clip: "left",
  folded: false,
  subgroupSort: "custom",
  machineSort: "custom",
  countMode: "allMachines",
};

test.beforeAll(() => {
  window.start({
    "nerd-herd.groups.backup": {
      data: { groups: [work], placements: [], topSubgroupSort: "custom", topMachineSort: "custom" },
      errorId: "8a9f6a5e-0000-4000-8000-000000000001",
      unixTimestamp: 1794000000,
    },
  });
  before = window.readUntil((lines) => lines.some((l) => l.includes("could not be read")));
  window.key("data-retry");
  after = window.read();
});

test.afterAll(() => window.stop());

test("before trying again, the card shows and the group does not", () => {
  expect([
    before.some((l) => l.includes("could not be read")),
    before.includes("Recovered"),
  ]).toEqual([true, false]);
});

test("trying again restores the readable backup: the group shows and the card goes", () => {
  expect([
    after.some((l) => l.includes("Recovered")),
    after.some((l) => l.includes("could not be read")),
  ]).toEqual([true, false]);
});
