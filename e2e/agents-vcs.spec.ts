// A card's version control label in a running Herdr window: a stand-in agent works in a jj
// repository two non-empty changes ahead of its main bookmark, made by the walk in its test home.
// The window runs on a private herdr-core session.

import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { AgentsWindow } from "./support/agents-window";
import { colorCount } from "./support/window-pixels";

const window = new AgentsWindow();
let card: string;
let longCard: string;
let green: number;
let lines: readonly string[];

/** The Agents cards: the whole sidebar's width, below the Spaces rows. */
const agentsCards = { from: 0, to: 0.31, top: 0.3, bottom: 1 } as const;

/** A long bookmark name, to show the card cutting it short. */
const longBookmark = "feature/rework-the-sync-scheduler-across-every-replica";

/** A jj repository whose working copy is two non-empty changes ahead of the given bookmark. */
const makeRepo = (dir: string, bookmark = "main"): void => {
  mkdirSync(dir, { recursive: true });
  const jj = (...args: string[]) => {
    const r = spawnSync("jj", args, { cwd: dir, encoding: "utf8" });
    if (r.status !== 0) throw new Error(`jj ${args.join(" ")} failed: ${r.stderr}`);
  };
  jj("git", "init");
  jj("describe", "-m", "base");
  jj("bookmark", "create", bookmark, "-r", "@");
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
  const longRepo = join(window.home, "long-repo");
  makeRepo(longRepo, longBookmark);
  window.startFakeAgent({ space: "long-repo", title: "Tune the cache", folder: longRepo });
  // The labels are read in the background; wait for both cards to show theirs.
  longCard = window.readUntilAgents(
    (text) => /feature\/r/.test(text) && /election\s+\S?2\s+repo/.test(text),
  );
  card = longCard;
  lines = window.read();
  green = colorCount(window, "#00ff00", agentsCards, "tinted");
});

test.afterAll(() => window.stop());

// Spec: docs/specs/in-progress/executing-nerd-herd-agents.html#test-case-a-card-on-main-shows-only-its-changes-ahead-as-spaces-does
// "A session in the space repo whose jj working copy is two changes ahead of main: the card shows ↑2
//  and no name, as Spaces shows a space on main." (The text reader may misread the arrow.)
test("a card on main in a repository named like its space shows only its changes ahead", () => {
  expect(card, "the first card: title, ↑2, then its space").toMatch(
    /Reset leader election\s+\S?2\s+repo This computer/,
  );
});

// Spec: docs/specs/in-progress/executing-nerd-herd-agents.html#test-case-a-long-bookmark-name-is-cut-in-the-middle-and-its-count-stays
// "A session two changes ahead of a bookmark whose name is longer than the label's room: the card
//  shows the start of the name and an ellipsis and the end of the name then ↑2."
// (the user, 2026-11-20: a long branch name "eats into the space for the title")
test("a card whose bookmark name is too long cuts it in the middle and keeps its count", () => {
  expect(longCard, "the start of the name, an ellipsis, then the count").toMatch(
    /feature\/r\S*(?:…|\.{2,3})\S*replica\s*\S?2\b/,
  );
});

// Spec: docs/specs/in-progress/executing-nerd-herd-agents.html#test-case-a-long-bookmark-name-leaves-the-title-its-room
// "A session titled Tune the cache whose bookmark name is longer than the label's room: the card's
//  title reads Tune the cache on one line."
test("a card whose bookmark name is too long still shows its whole title on one line", () => {
  expect(
    lines.some((l) => /Tune the cache/.test(l)),
    `a line holding the whole title in: ${lines.join(" | ")}`,
  ).toBe(true);
});

// Spec: docs/specs/in-progress/executing-nerd-herd-agents.html#test-case-the-changes-ahead-show-in-green-as-in-spaces
// "A session two changes ahead of its bookmark: the card's ↑2 is green as Spaces draws it."
// (the user, 2026-11-20: Spaces has "a kind of green" and the card's label is "plain white text")
test("a card's count of changes ahead is green, as in Spaces", () => {
  expect(green, "green pixels in the Agents cards").toBeGreaterThan(20);
});

// Spec: docs/specs/in-progress/executing-nerd-herd-agents.html#test-case-spaces-and-a-card-show-the-same-label
// "The space long-repo and its session's card: the space's row and the card show the same cut
//  name and the same ↑2." (the user, 2026-11-20: "the branch name needs to be rendered the same in
//  both sections. all the same pieces of info do")
test("a space's row in Spaces and its session's card show the same label", () => {
  const label = /feature\/r\S*?(?:…|\.{2,3})\S*\s+\S?2\b/;
  // The row holds the space's name and the label; the card's label line holds no space name. The
  // reader may put the row's avatar letter before the name ("L long-repo ..." on a 1x screen).
  const row = lines.find((l) => /\blong-repo\b/.test(l) && label.test(l))?.match(label)?.[0];
  const cardLine = lines.find((l) => !/\blong-repo\b/.test(l) && label.test(l))?.match(label)?.[0];
  expect(
    row !== undefined && row === cardLine,
    `the same label in the row (${row}) and the card (${cardLine}) in: ${lines.join(" | ")}`,
  ).toBe(true);
});
