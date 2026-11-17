// The walking skeleton for the nerd-herd Spaces mod (spec: docs/specs/in-progress/executing-nerd-herd-spaces.html).
// It walks the Narrative's skeleton journey in a test Herdr window and reads what the sidebar draws.

import { expect, test } from "@playwright/test";
import { HerdrWindow, type MachineName, type ScreenLines } from "./support/herdr-window";

const window = new HerdrWindow();
let machine: MachineName;
let foldedAfterRestart: ScreenLines;
let openedAfterRestart: ScreenLines;

test.beforeAll(() => {
  machine = window.remoteMachine();
  window.start();
  window.act("settings-word", { singular: "Environment", plural: "Environments" });
  window.act("group-make", { name: "Work", icon: "💼" });
  window.act("group-make", { name: "Personal" });
  window.act("group-banner", { group: "Work", open: "https://banners.example/work.png" });
  window.act("group-make", { name: "Clients", parent: "Work" });
  window.act("machine-move", { machine, group: "Work" });
  window.act("machine-move", { machine: null, group: "Work" });
  window.act("sort-set", { group: null, subgroups: "alphabetical" });
  window.act("group-fold", { group: "Work", folded: true });
  window.restart();
  foldedAfterRestart = window.read();
  window.act("group-fold", { group: "Work", folded: false });
  openedAfterRestart = window.read();
});

test.afterAll(() => window.stop());

// Marked: the spec changed on 2026-11-17 (a banner takes its group's row's place); red until drawn.
test.fail("Dannel renames the sidebar's word for groups to Environments, makes a Work environment with an emoji icon and a banner link, nests a Clients environment inside it, drags a machine and This computer into Work, sorts and folds the environments, and after Herdr restarts sees those machines' spaces still inside the folded Work environment in their custom order", () => {
  // Each check compares against everything the sidebar drew, so a failure shows what was drawn.
  const folded = foldedAfterRestart.join("\n");
  const opened = openedAfterRestart.join("\n");
  // After the restart, folded: the sorted environments, Work's banner in place of its row with the
  // count on it, and the chosen word. "Work" as a word is never drawn: its row is not shown.
  expect(folded, "Personal is drawn above Work's banner (alphabetical)").toMatch(
    /Personal[\s\S]*\nWORK BANNER/,
  );
  expect(folded, "Work's row is not drawn while its banner shows").not.toMatch(/(^|\s)Work(\s|$)/m);
  expect(folded, "Work's banner carries the count of its 2 machines").toMatch(
    /WORK BANNER[^\n]*\b2\b/,
  );
  expect(folded, "the new-group button uses the chosen word").toContain("New environment");
  // Opened again: Work's banner, then Clients, then the machines in the order they were dropped.
  expect(opened, "Work holds Clients, then the machine, then This computer").toMatch(
    new RegExp(`WORK BANNER[\\s\\S]*Clients[\\s\\S]*${machine}[\\s\\S]*This computer`),
  );
});
