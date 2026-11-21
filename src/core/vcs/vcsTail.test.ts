import { expect, test } from "bun:test";
import { vcsTail } from "./vcsTail";

// The label Spaces and Agents both draw after a space's name, by Herdr's Spaces rule: "Only what's
// unusual, after the name ... master/main go: nearly every space is on one." (the user,
// 2026-11-20: "the branch name needs to be rendered the same in both sections. all the same pieces
// of info do"; "they should be treated as re-usable components for those parts").

const info = { repo: "herdr", branch: "spike", ahead: 0, behind: 0 };

test("a space on main in a repository named like the space shows no name", () => {
  expect(
    vcsTail({ ...info, repo: "sandbox", branch: "main" }, { place: "sandbox" }).where,
    "no name",
  ).toBe("");
});

test("a space on master shows no branch", () => {
  expect(
    vcsTail({ ...info, repo: "sandbox", branch: "master" }, { place: "sandbox" }).where,
    "no branch",
  ).toBe("");
});

// The repository's name leaves the label for the space name's tooltip (Dannel, 2026-11-21: "i think
// that information belongs as a tooltip of the space name, not a tooltip of the branch").

test("a space named unlike its repository shows only its branch", () => {
  expect(vcsTail(info, { place: "notes" }).where, "the branch alone").toBe("spike");
});

test("a branch named like the space is left out, and the label shows no name", () => {
  expect(vcsTail(info, { place: "Spike" }).where, "no name").toBe("");
});

test("the repository's name is given for the space name's tooltip", () => {
  expect(vcsTail(info, { place: "notes" }).repo, "the repository's name").toBe("herdr");
});

test("a name longer than 20 characters is cut in its middle", () => {
  expect(
    vcsTail(
      {
        ...info,
        repo: "long-repo",
        branch: "feature/rework-the-sync-scheduler-across-every-replica",
      },
      { place: "long-repo" },
    ).where,
    "the start, an ellipsis, the end",
  ).toBe("feature/re…y-replica");
});

test("the whole name is kept for the hover text", () => {
  expect(
    vcsTail(
      {
        ...info,
        repo: "long-repo",
        branch: "feature/rework-the-sync-scheduler-across-every-replica",
      },
      { place: "long-repo" },
    ).whole,
    "the whole name",
  ).toBe("feature/rework-the-sync-scheduler-across-every-replica");
});

test("the changes ahead and behind are carried as counts", () => {
  const tail = vcsTail({ ...info, ahead: 2, behind: 1 }, { place: "notes" });
  expect([tail.ahead, tail.behind], "ahead 2, behind 1").toEqual([2, 1]);
});
