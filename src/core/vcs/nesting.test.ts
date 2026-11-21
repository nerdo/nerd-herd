import { expect, test } from "bun:test";
import { nestedCheckout } from "./nesting";
import type { VcsInfo } from "./vcsTail";

// Spaces moves a second checkout's space (a git worktree or a second jj workspace) under the space
// of its repository's main checkout, and leaves the repository's name off its label, since the row
// above names it. A card shows the same label as its space's row (the user, 2026-11-20: "the branch
// name needs to be rendered the same in both secitions. all the sam pieces of info do"; 2026-11-21,
// of a card reading "strflt-system-administration · Keenser/herdr-instead-of-orca": "why is the
// repository name in there?").

const at = (path: string, linked: boolean): VcsInfo => ({
  repo: "strflt-system-administration",
  branch: "Keenser/herdr-instead-of-orca",
  ahead: 198,
  behind: 0,
  checkout: { path, linked },
});
const repo = "/work/strflt-system-administration/.jj/repo";

test("a session in a second checkout, whose repository's main checkout has a space, is nested", () => {
  expect(
    nestedCheckout(
      { machine: null, info: at(repo, true) },
      [{ machine: null, info: at(repo, false) }],
    ),
    "nested under the main checkout's space",
  ).toBe(true);
});

test("a session in a second checkout, whose repository's main checkout has no space, is not nested", () => {
  expect(
    nestedCheckout({ machine: null, info: at(repo, true) }, [{ machine: null, info: at(repo, true) }]),
    "not nested",
  ).toBe(false);
});

test("a second checkout on another machine than the main checkout's space is not nested", () => {
  expect(
    nestedCheckout(
      { machine: "frankenstein-nerdo", info: at(repo, true) },
      [{ machine: null, info: at(repo, false) }],
    ),
    "not nested",
  ).toBe(false);
});
