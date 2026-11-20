// Show as in every combination: each Spaces look (banner, second, folder) against each Agents look
// (Same as Spaces, banner, second, folder), read from both panels of a running Herdr window. The
// first banner style is WORK BANNER and the second HOME BANNER, so a reading tells them apart from
// the folder (the user, 2026-11-20: "test variations that cover enough ground to say with
// confidence that it works"). The window runs on a private herdr-core session.

import { expect, test } from "@playwright/test";
import { e2eSettings } from "./support/e2e-settings";
import { AgentsWindow } from "./support/agents-window";

const window = new AgentsWindow();
const homeBanner = e2eSettings.bannerFixture.replace("work-banner.png", "home-banner.png");
const spacesLooks = ["banner", "second", "folder"] as const;
const agentsLooks = ["spaces", "banner", "second", "folder"] as const;
type Drawn = "banner" | "second" | "folder" | "nothing";

/** What a panel's lines show for the Work group: its first banner, its second, or its folder. */
const drawn = (lines: readonly string[]): Drawn =>
  lines.some((l) => l.includes("WORK BANNER"))
    ? "banner"
    : lines.some((l) => l.includes("HOME BANNER"))
      ? "second"
      : lines.some((l) => /\bWork\b/.test(l))
        ? "folder"
        : "nothing";

const seen = new Map<string, { spaces: Drawn; agents: Drawn }>();

test.beforeAll(() => {
  window.start();
  window.startFakeAgent({ space: "sandbox", title: "Reset leader election" });
  window.act("group-make", { name: "Work" });
  window.act("machine-move", { machine: null, group: "Work" });
  window.act("group-banner", {
    group: "Work",
    open: e2eSettings.bannerFixture,
    secondOpen: homeBanner,
  });
  window.actAgents("sort", { id: "groups" });
  window.readUntil((lines) => lines.some((l) => l.includes("WORK BANNER")));
  for (const spacesLook of spacesLooks)
    for (const agentsLook of agentsLooks) {
      window.act("group-set", { group: "Work", spacesLook, agentsLook });
      const lines = window.read();
      const at = lines.findIndex((l) => /^Agents\b/.test(l));
      const agents = at < 0 ? [] : lines.slice(at + 1);
      seen.set(`${spacesLook}/${agentsLook}`, {
        spaces: drawn(at < 0 ? lines : lines.slice(0, at)),
        agents: drawn(agents),
      });
    }
});

test.afterAll(() => window.stop());

// Spec: docs/specs/finalized/nerd-herd-agents.html#test-case-each-panel-draws-its-own-look@jj:14ab73a0
// and #test-case-agents-follows-spaces-by-default and #test-case-the-second-banner-style-has-its-own-images
for (const spacesLook of spacesLooks)
  for (const agentsLook of agentsLooks) {
    const agentsDraws = agentsLook === "spaces" ? spacesLook : agentsLook;
    test(`Show as ${spacesLook} in Spaces and ${agentsLook} in Agents draws ${spacesLook} in Spaces and ${agentsDraws} in Agents`, () => {
      expect(seen.get(`${spacesLook}/${agentsLook}`), "what each panel draws").toEqual({
        spaces: spacesLook,
        agents: agentsDraws,
      });
    });
  }
