import { expect, test } from "bun:test";
import { vcsTail } from "./vcsTail";

// The label Spaces and Agents both draw after a space's name, by Herdr's Spaces rule: "Only what's
// unusual, after the name ... master/main go: nearly every space is on one." (the user,
// 2026-11-20: "the branch name needs to be rendered the same in both sections. all the same pieces
// of info do"; "they should be treated as re-usable components for those parts").

const info = { repo: "herdr", branch: "spike", ahead: 0, behind: 0 };

test("a space on main in a repository named like the space shows no name", () => {
  expect(
    vcsTail({ ...info, repo: "sandbox", branch: "main" }, { place: "sandbox", nested: false }).where,
    "no name",
  ).toBe("");
});

test("a space on master shows no branch", () => {
  expect(
    vcsTail({ ...info, repo: "sandbox", branch: "master" }, { place: "sandbox", nested: false })
      .where,
    "no branch",
  ).toBe("");
});

test("a repository and branch unlike the space's name both show, joined by a dot", () => {
  expect(vcsTail(info, { place: "notes", nested: false }).where, "repository · branch").toBe(
    "herdr · spike",
  );
});

test("a branch named like the space is left out", () => {
  expect(vcsTail(info, { place: "Spike", nested: false }).where, "the repository alone").toBe(
    "herdr",
  );
});

test("a space nested under its repository's main checkout leaves the repository out", () => {
  expect(vcsTail(info, { place: "notes", nested: true }).where, "the branch alone").toBe("spike");
});

test("a name longer than 20 characters is cut in its middle", () => {
  expect(
    vcsTail(
      { ...info, repo: "long-repo", branch: "feature/rework-the-sync-scheduler-across-every-replica" },
      { place: "long-repo", nested: false },
    ).where,
    "the start, an ellipsis, the end",
  ).toBe("feature/re…y-replica");
});

test("the whole name is kept for the hover text", () => {
  expect(
    vcsTail(
      { ...info, repo: "long-repo", branch: "feature/rework-the-sync-scheduler-across-every-replica" },
      { place: "long-repo", nested: false },
    ).whole,
    "the whole name",
  ).toBe("feature/rework-the-sync-scheduler-across-every-replica");
});

test("the changes ahead and behind are carried as counts", () => {
  const tail = vcsTail({ ...info, ahead: 2, behind: 1 }, { place: "notes", nested: false });
  expect([tail.ahead, tail.behind], "ahead 2, behind 1").toEqual([2, 1]);
});
