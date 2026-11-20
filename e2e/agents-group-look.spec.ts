// UX validation: Grouped by group in a running Herdr window, with a banner group, a folder group and
// a machine in no group, each running a stand-in agent. The machines are private herdr-core
// sessions on this computer (AgentsWindow.addMachine), never the person's own machines.

import { expect, test } from "@playwright/test";
import { e2eSettings } from "./support/e2e-settings";
import { AgentsWindow } from "./support/agents-window";

const window = new AgentsWindow();
let agentsText: string;
let sort: unknown;

test.beforeAll(() => {
  window.start();
  window.addMachine("desk-client");
  window.addMachine("desk-home");
  window.startFakeAgent({ space: "client", title: "Ship the release", machine: "desk-client" });
  window.startFakeAgent({ space: "home", title: "NAS drive health", machine: "desk-home" });
  window.startFakeAgent({ space: "sandbox", title: "Local notes" });
  window.act("group-make", { name: "Work" });
  window.act("group-make", { name: "Personal" });
  window.act("machine-move", { machine: "desk-client", group: "Work" });
  window.act("machine-move", { machine: "desk-home", group: "Personal" });
  window.act("group-banner", { group: "Work", open: e2eSettings.bannerFixture });
  window.readUntil((lines) => lines.some((l) => l.includes("WORK BANNER")));
  window.sendAgents("open-sort");
  window.herdr("overlay.close", {});
  window.actAgents("sort", { id: "groups" });
  agentsText = window.readAgents();
  sort = window.sharedValue("agents.sort");
});

test.afterAll(() => window.stop());

// Spec: docs/specs/finalized/nerd-herd-agents.html#test-case-grouped-by-group-in-the-running-herdr-window@jj:14ab73a0
// "A test home with a banner group, a folder group and an ungrouped space, each with agent
//  sessions; Grouped by group picked from the clock menu: the screenshot shows the banner group
//  with its banner and the folder group as a folder, as in Spaces, each with status folders,
//  Ungrouped last, and every card's title readable before its location; agents.sort is groups."
test("grouped by group, Work shows its banner, Personal its folder, Ungrouped comes last, titles before locations, and agents.sort is groups", () => {
  expect(
    { agentsText, sort },
    "Work's banner and card, Personal and its card, then Ungrouped and the local card",
  ).toEqual({
    agentsText:
      "WORK BANNER Ship the release client · desk-client " +
      "Personal NAS drive health home · desk-home " +
      "Ungrouped Local notes sandbox · This computer",
    sort: "groups",
  });
});
