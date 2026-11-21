// A card's version control label for a session in a second jj workspace, in a running Herdr window.
// Spaces nests that workspace's space under its main checkout's space and leaves the repository's
// name off its row; the card leaves it off too. The window runs on a private herdr-core session.

import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { AgentsWindow } from "./support/agents-window";

const window = new AgentsWindow();
let cards: string;

const jjIn = (dir: string) => (...args: string[]) => {
  const r = spawnSync("jj", args, { cwd: dir, encoding: "utf8" });
  if (r.status !== 0) throw new Error(`jj ${args.join(" ")} failed: ${r.stderr}`);
};

test.beforeAll(() => {
  window.start();
  const main = join(window.home, "herdr-main");
  const spike = join(window.home, "herdr-spike");
  mkdirSync(main, { recursive: true });
  const jj = jjIn(main);
  jj("git", "init");
  jj("describe", "-m", "base");
  jj("bookmark", "create", "feature-x", "-r", "@");
  jj("new", "-m", "first");
  writeFileSync(join(main, "one.txt"), "one\n");
  jj("new", "-m", "second");
  writeFileSync(join(main, "two.txt"), "two\n");
  jj("new");
  // A second workspace starts on the same parent as the main one's working copy: two ahead too.
  jj("workspace", "add", spike);
  window.startFakeAgent({ space: "herdr-main", title: "Keep main green", folder: main });
  window.startFakeAgent({ space: "herdr-spike", title: "Ship the spike", folder: spike });
  // The labels are read in the background; wait for both cards to show theirs.
  cards = window.readUntilAgents(
    (text) => /Keep main green\s+feature-x/.test(text) && /Ship the spike\s+\S/.test(text) && (text.match(/feature-x/g) ?? []).length >= 2,
  );
});

test.afterAll(() => window.stop());

// Spec: docs/specs/in-progress/executing-nerd-herd-agents.html#test-case-a-card-in-a-second-checkout-leaves-out-the-repository-name
// "The Ship the spike card reads feature-x and ↑2, with no herdr-main before them." (Dannel,
// 2026-11-21: "why is the repository name in there?") The text reader may misread the arrow.
test("a card in a second jj workspace, whose main workspace has a space, leaves out the repository name", () => {
  expect(cards, "Ship the spike, then feature-x and ↑2, then its space").toMatch(
    /Ship the spike\s+feature-x\s+\S?2\s+herdr-spike/,
  );
});
