// The Agents sort menu behind the clock icon: Herdr's two choices and nerd-herd's Grouped by group,
// opened and picked through the mod's own commands (AGENTS.md, rule 3) on a private herdr-core.

import { expect, test } from "@playwright/test";
import { AgentsWindow } from "./support/agents-window";

const window = new AgentsWindow();
const subject = "Reset leader election";

let menu: readonly string[];
let grouped: string;

test.beforeAll(() => {
  window.start();
  window.startFakeAgent({ space: "sandbox", title: subject });
  window.readAgents();
  window.sendAgents("open-sort");
  menu = window.readWindow();
  window.closeOverlay();
  window.actAgents("sort", { id: "groups" });
  grouped = window.readAgents();
});

test.afterAll(() => window.stop());

// Spec: docs/specs/finalized/nerd-herd-agents.html#test-case-the-new-choice-uses-the-group-word@jj:14ab73a0
// The menu shows the choices the session list's sortChoices names, in the Spaces group word
// ("Group" by default).
test("the sort menu lists Priority, Grouped by space and Grouped by group", () => {
  expect(menu.join("\n"), "the three choices in order").toMatch(
    /Priority[\s\S]*Grouped by space[\s\S]*Grouped by group/,
  );
});

// Spec: docs/specs/finalized/nerd-herd-agents.html#test-case-ungrouped-comes-after-the-groups@jj:14ab73a0
// Picking Grouped by group arranges the list by group; this computer is in no group here.
test("picking Grouped by group lists a session on a machine in no group under Ungrouped", () => {
  expect(grouped, "the Ungrouped section holding the card").toBe(
    `Ungrouped ${subject} sandbox This computer`,
  );
});
