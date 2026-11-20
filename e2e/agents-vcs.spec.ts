// A card's version control label in a running Herdr window: a stand-in agent works in a jj
// repository two non-empty changes ahead of its main bookmark, made by the walk in its test home.
// The window runs on a private herdr-core session.

import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { AgentsWindow } from "./support/agents-window";

const window = new AgentsWindow();
let card: string;

/** A jj repository whose working copy is two non-empty changes ahead of the main bookmark. */
const makeRepo = (dir: string): void => {
  mkdirSync(dir, { recursive: true });
  const jj = (...args: string[]) => {
    const r = spawnSync("jj", args, { cwd: dir, encoding: "utf8" });
    if (r.status !== 0) throw new Error(`jj ${args.join(" ")} failed: ${r.stderr}`);
  };
  jj("git", "init");
  jj("describe", "-m", "base");
  jj("bookmark", "create", "main", "-r", "@");
  jj("new", "-m", "first");
  writeFileSync(join(dir, "one.txt"), "one\n");
  jj("new", "-m", "second");
  writeFileSync(join(dir, "two.txt"), "two\n");
  jj("new");
};

test.beforeAll(() => {
  window.start();
  const repo = join(window.home, "repo");
  makeRepo(repo);
  window.startFakeAgent({ space: "repo", title: "Reset leader election", folder: repo });
  window.startShellTab();
  // The label is read in the background, every 10 s.
  card = window.readUntilAgents((text) => /\bmain\b/.test(text));
});

test.afterAll(() => window.stop());

// Spec: docs/specs/in-progress/executing-nerd-herd-agents.html#test-case-a-card-shows-its-jj-bookmark-and-the-changes-ahead-of-it@jj:607ab1aa
// "A session in a jj repository whose working copy is two non-empty changes ahead of the main
//  bookmark: the card reads main ↑2 under its time." (The text reader may misread the arrow.)
test("a card in a jj repository two changes ahead of main reads main ↑2", () => {
  expect(card, "the card's version control label").toMatch(/\bmain \S?2\b/);
});
