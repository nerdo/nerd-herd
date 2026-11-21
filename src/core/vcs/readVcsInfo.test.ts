import { expect, test } from "bun:test";
import { type VcsExec, readVcsInfo } from "./readVcsInfo";

// Agents reads a session's folder with the commands Herdr's Spaces runs for a space's folder, so
// both sections draw the same facts (the user, 2026-11-20: "all the same pieces of info do").

type Answers = Record<string, { code: number; stdout: string; stderr?: string }>;

/** An exec that answers a command line it knows, keyed by "program arg arg" without jj's quiet
 *  flags, and fails others as git does outside a repository. */
const fakeExec =
  (answers: Answers): VcsExec =>
  async (program, args) => {
    const quiet = ["--ignore-working-copy", "--no-pager", "--color=never"];
    const key = [program, ...args.filter((a) => !quiet.includes(a))].join(" ");
    const hit = Object.entries(answers).find(([k]) => key.startsWith(k) || key.includes(k));
    return hit ? { stderr: "", ...hit[1] } : { code: 1, stdout: "", stderr: "not a git repository" };
  };

const jjAt = (o: { top: string; bookmark: string; ahead: number; pointer?: string }): Answers => ({
  "jj root": { code: 0, stdout: `${o.top}\n` },
  "heads(::@ & bookmarks())..@": { code: 0, stdout: "x".repeat(o.ahead) },
  "heads(::@ & bookmarks())": { code: 0, stdout: `zzzz\t${o.bookmark}\n` },
  [`cat ${o.top}/.jj/repo`]: o.pointer
    ? { code: 0, stdout: o.pointer }
    : { code: 1, stdout: "", stderr: "Is a directory" },
});

test("a jj folder two changes ahead of main reads its repository, main, and 2 ahead", async () => {
  expect(
    await readVcsInfo(fakeExec(jjAt({ top: "/work/sandbox", bookmark: "main", ahead: 2 }))),
    "the folder's version control",
  ).toMatchObject({ repo: "sandbox", branch: "main", ahead: 2, behind: 0 });
});

test("a second jj workspace reads the name of the repository it belongs to", async () => {
  expect(
    (
      await readVcsInfo(
        fakeExec(
          jjAt({ top: "/work/spike", bookmark: "main", ahead: 0, pointer: "../../herdr/.jj/repo" }),
        ),
      )
    )?.repo,
    "the main repository's name",
  ).toBe("herdr");
});

const gitAt = (o: { branch: string | null; counts: string }): Answers => ({
  "git rev-parse --path-format=absolute --show-toplevel": { code: 0, stdout: "/src/herdr\n" },
  "git rev-parse --path-format=absolute --git-common-dir": { code: 0, stdout: "/src/herdr/.git\n" },
  "git symbolic-ref": o.branch
    ? { code: 0, stdout: `refs/heads/${o.branch}\n` }
    : { code: 1, stdout: "" },
  "git rev-list": { code: 0, stdout: o.counts },
});

test("a git folder on spike three ahead and one behind reads those", async () => {
  expect(
    await readVcsInfo(fakeExec(gitAt({ branch: "spike", counts: "3\t1\n" }))),
    "the folder's version control",
  ).toMatchObject({ repo: "herdr", branch: "spike", ahead: 3, behind: 1 });
});

test("a git folder with a detached HEAD reads (detached) as its branch", async () => {
  expect(
    (await readVcsInfo(fakeExec(gitAt({ branch: null, counts: "0\t0\n" }))))?.branch,
    "the branch",
  ).toBe("(detached)");
});

test("a folder in no repository reads nothing", async () => {
  expect(await readVcsInfo(fakeExec({})), "no version control").toBeNull();
});

// Spaces nests a second checkout's space under its main checkout's space (src/core/vcs/nesting.ts),
// so a folder's read says which repository it belongs to and whether it is a second checkout.

test("a second jj workspace reads its repository's path and that it is a second checkout", async () => {
  expect(
    (
      await readVcsInfo(
        fakeExec(
          jjAt({ top: "/work/spike", bookmark: "main", ahead: 0, pointer: "../../herdr/.jj/repo" }),
        ),
      )
    )?.checkout,
    "the main repository's path, linked",
  ).toEqual({ path: "/work/herdr/.jj/repo", linked: true });
});

test("a main jj workspace reads its own repository's path and that it is the main checkout", async () => {
  expect(
    (await readVcsInfo(fakeExec(jjAt({ top: "/work/herdr", bookmark: "main", ahead: 0 }))))?.checkout,
    "its own path, not linked",
  ).toEqual({ path: "/work/herdr/.jj/repo", linked: false });
});

test("a git worktree reads its repository's path and that it is a second checkout", async () => {
  const answers = {
    ...gitAt({ branch: "spike", counts: "0\t0\n" }),
    "git rev-parse --path-format=absolute --show-toplevel": { code: 0, stdout: "/src/herdr-spike\n" },
  };
  expect(
    (await readVcsInfo(fakeExec(answers)))?.checkout,
    "the main repository's .git, linked",
  ).toEqual({ path: "/src/herdr/.git", linked: true });
});

test("a git main checkout reads its own .git and that it is the main checkout", async () => {
  expect(
    (await readVcsInfo(fakeExec(gitAt({ branch: "spike", counts: "0\t0\n" }))))?.checkout,
    "its own .git, not linked",
  ).toEqual({ path: "/src/herdr/.git", linked: false });
});
