// The walking skeleton for the nerd-herd Spaces mod (spec: docs/specs/in-progress/executing-nerd-herd-spaces.html).
// It walks the Narrative's skeleton journey in a test Herdr window and reads what the sidebar draws.

import { readdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { HerdrWindow, type MachineName, type ScreenLines } from "./support/herdr-window";

const window = new HerdrWindow();
let machine: MachineName;
let foldedAfterRestart: ScreenLines;
let openedAfterRestart: ScreenLines;
let bannerFiles: string[];
let newGroupDialog: ScreenLines;

test.beforeAll(() => {
  machine = window.remoteMachine();
  // Run directly so Herdr keeps the PATH with the fake curl (a background launch gets the login
  // shell's PATH); this walk takes the front for a moment at its start and restart.
  window.start({}, undefined, "direct");
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
  bannerFiles = readdirSync(join(window.home, "mods/nerd-herd-spaces/.banners"));
  window.act("open", { panel: "name", target: { kind: "new", parent: null } });
  newGroupDialog = window.readWindow();
  window.herdr("overlay.close", {});
});

test.afterAll(() => window.stop());

test("Dannel renames the sidebar's word for groups to Environments, makes a Work environment with an emoji icon and a banner link, nests a Clients environment inside it, drags a machine and This computer into Work, sorts and folds the environments, and after Herdr restarts sees those machines' spaces still inside the folded Work environment in their custom order", () => {
  // Each check compares against everything the sidebar drew, so a failure shows what was drawn.
  const folded = foldedAfterRestart.join("\n");
  const opened = openedAfterRestart.join("\n");
  // After the restart, folded: the sorted environments, Work's banner in place of its row with the
  // count on it, and the chosen word. "Work" as a word is never drawn: its row is not shown.
  expect(folded, "Personal is drawn above Work's banner (alphabetical)").toMatch(
    /Personal[\s\S]*\nWORK BANNER/,
  );
  expect(folded, "Work's row is not drawn while its banner shows").not.toMatch(/(^|\s)Work(\s|$)/m);
  // Not read here: the count on Work's banner. Vision reads that dim digit beside the icons
  // inconsistently on identical screens (2026-11-17: "2฿ +", "20 +", or nothing). The count is
  // guaranteed by src/core/presentation/groupHeaderLook.test.ts and the group model's count tests.
  // The new-group button is an icon in the header (its tooltip names it); its dialog uses the word.
  expect(folded, "no new-group row in the sidebar").not.toContain("New environment");
  expect(newGroupDialog, "the new-group dialog uses the chosen word").toContain("New environment");
  // Opened again: Clients, then the machines in the order they were dropped. Herdr's Spaces list
  // keeps the active space in view, which can scroll Work's banner above the top (2026-11-17), so
  // the reading starts at Clients; that the banner is drawn is checked in the folded reading.
  expect(opened, "Work holds Clients, then the machine, then This computer").toMatch(
    new RegExp(`Clients[\\s\\S]*${machine}[\\s\\S]*This computer`),
  );
});

// Found by the 2026-11-17 production-path probe: in Herdr the file was "-16630bae599c670c.png", a
// name command-line tools can read as an option. Herdr's engine is the only place it shows.
test("a downloaded banner is saved under a name of hex digits", () => {
  expect(bannerFiles.filter((f) => !f.endsWith(".tmp"))).toEqual([
    expect.stringMatching(/^[0-9a-f]{16}\.png$/),
  ]);
});
