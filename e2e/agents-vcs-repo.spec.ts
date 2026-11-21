// The version control label of a space named unlike its repository, in a running Herdr window: the
// label carries the branch and its count, and the repository's name is left to the space name's
// tooltip, in Spaces and on the card alike. The window runs on a private herdr-core session.

import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { AgentsWindow } from "./support/agents-window";

const window = new AgentsWindow();
let lines: readonly string[];

test.beforeAll(() => {
  window.start();
  const repo = join(window.home, "herdr-main");
  mkdirSync(repo, { recursive: true });
  const jj = (...args: string[]) => {
    const r = spawnSync("jj", args, { cwd: repo, encoding: "utf8" });
    if (r.status !== 0) throw new Error(`jj ${args.join(" ")} failed: ${r.stderr}`);
  };
  jj("git", "init");
  jj("describe", "-m", "base");
  jj("bookmark", "create", "feature-x", "-r", "@");
  jj("new", "-m", "first");
  writeFileSync(join(repo, "one.txt"), "one\n");
  jj("new", "-m", "second");
  writeFileSync(join(repo, "two.txt"), "two\n");
  jj("new");
  window.startFakeAgent({ space: "notes", title: "Ship the notes", folder: repo });
  // The labels are read in the background; wait for the card and the row to show theirs.
  window.readUntilAgents((text) => /Ship the notes\s+\S*\s*feature-x/.test(text));
  lines = window.read();
});

test.afterAll(() => window.stop());

// Spec: docs/specs/in-progress/executing-nerd-herd-agents.html#test-case-a-space-named-unlike-its-repository-shows-only-its-branch
// "The space notes on the jj repository herdr-main, two changes ahead of feature-x, with a session:
//  the Spaces row and the card each read feature-x and ↑2, and neither reads herdr-main." (Dannel,
//  2026-11-21: the repository name "belongs as a tooltip of the space name, not a tooltip of the
//  branch")
test("a space named unlike its repository shows only its branch and count, in Spaces and on its card", () => {
  const labels = lines.filter((l) => /feature-x/.test(l));
  expect(
    labels.length === 2 &&
      labels.every((l) => !/herdr-main/.test(l) && /feature-x\s+\S?2\b/.test(l)),
    `two labels reading feature-x and ↑2 without herdr-main in: ${lines.join(" | ")}`,
  ).toBe(true);
});
