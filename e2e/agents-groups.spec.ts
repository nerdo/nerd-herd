// Grouped by group in a running Herdr window: a Spaces group holding this computer, the Agents list
// sorted by group, and the group folded in Agents only. Driven through the mods' own commands
// (AGENTS.md, rule 3) on a private herdr-core session.

import { expect, test } from "@playwright/test";
import { AgentsWindow } from "./support/agents-window";

const window = new AgentsWindow();
const subject = "Reset leader election";

let folded: string;
let spacesAfterFold: readonly string[];

test.beforeAll(() => {
  window.start();
  window.startFakeAgent({ space: "sandbox", title: subject });
  window.act("group-make", { name: "Work" });
  window.act("machine-move", { machine: null, group: "Work" });
  // Spaces draws the group a moment later; wait for it, as a person would, before going on.
  window.readUntil((lines) => /Work[\s\S]*This computer/.test(lines.join("\n")));
  window.actAgents("sort", { id: "groups" });
  window.readAgents();
  window.actAgents("fold", { group: "Work" });
  folded = window.readAgents();
  const lines = window.read();
  spacesAfterFold = lines.slice(
    0,
    lines.findIndex((l) => /^Agents\b/.test(l)),
  );
});

test.afterAll(() => window.stop());

// Spec: docs/specs/finalized/nerd-herd-agents.html#test-case-folding-in-agents-does-not-fold-spaces@jj:14ab73a0
// "The Work group open in Spaces: when Dannel folds the Work section in Agents, the Work section in
//  Agents is folded, and Spaces still shows Work open."
test("folding Work in Agents leaves Work's header there and hides its sessions", () => {
  expect(folded, "the Work header alone").toBe("Work");
});

test("folding Work in Agents leaves Work open in Spaces, with This computer inside it", () => {
  expect(spacesAfterFold.join("\n"), "Work, then This computer under it").toMatch(
    /Work[\s\S]*This computer/,
  );
});
