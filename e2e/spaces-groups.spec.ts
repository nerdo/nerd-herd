// The walking skeleton for the nerd-herd Spaces mod (spec: docs/specs/in-progress/executing-nerd-herd-spaces.html).
// It walks the Narrative's skeleton journey in a test Herdr window and reads what the sidebar draws.

import { expect, test } from "@playwright/test";
import { HerdrWindow, type MachineName, type ScreenLines } from "./support/herdr-window";

const window = new HerdrWindow();
let machine: MachineName;
let beforeRestart: ScreenLines;
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
  beforeRestart = window.read();
  window.restart();
  foldedAfterRestart = window.read();
  window.act("group-fold", { group: "Work", folded: false });
  openedAfterRestart = window.read();
});

test.afterAll(() => window.stop());

test.fail(
  "Dannel renames the sidebar's word for groups to Environments, makes a Work environment with an emoji icon and a banner link, nests a Clients environment inside it, drags a machine and This computer into Work, sorts and folds the environments, and after Herdr restarts sees those machines' spaces still inside the folded Work environment in their custom order",
  () => {
    // Each check compares against everything the sidebar drew, so a failure shows what was drawn.
    const folded = foldedAfterRestart.join("\n");
    const opened = openedAfterRestart.join("\n");
    // After the restart, folded: the sorted environments, Work's banner and count, and the chosen word.
    expect(folded, "Personal is drawn above Work (alphabetical)").toMatch(/Personal[\s\S]*\nWork/);
    expect(folded, "Work's banner is drawn while Work is folded").toContain("WORK BANNER");
    expect(folded, "Work's folded header counts its 2 machines").toMatch(/Work[^\n]*\b2\b/);
    expect(folded, "the new-group button uses the chosen word").toContain("New environment");
    // Opened again: Clients first, then the machines in the order they were dropped.
    expect(opened, "Work holds Clients, then the machine, then This computer").toMatch(
      new RegExp(`Work[\\s\\S]*Clients[\\s\\S]*${machine}[\\s\\S]*This computer`),
    );
  },
);

// Step tests: the stub chain the view draws. The composition root is real from step 6 on.
// Text recognition reads the digit 0 as the letter O; no stub text holds a capital O, so a read O counts as 0.
const drawn = (lines: ScreenLines) => lines.join(" ").replaceAll("O", "0");

test("step 6 of 7, before the restart: the composition root is real and its view model holds no rows for the 9 actions", () => {
  expect(drawn(beforeRestart)).toContain("STUB view > 0 rows, Groups (9 actions)");
});

test("step 6 of 7, after the restart: the view model holds no rows and no action is remembered", () => {
  expect(drawn(foldedAfterRestart)).toContain("STUB view > 0 rows, Groups (0 actions)");
});
