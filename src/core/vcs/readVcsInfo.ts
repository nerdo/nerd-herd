// A folder's version control, read with the commands Herdr's Spaces runs for a space's folder: jj
// first, since git in a jj repository sees only a detached HEAD, then git.

import { readJjState } from "../jj/vcsLabel";
import type { VcsInfo } from "./vcsTail";

/** Runs a program with these arguments in the folder, on its machine; null when it cannot run. */
export type VcsExec = (
  program: string,
  args: readonly string[],
) => Promise<{ code: number; stdout: string; stderr: string } | null>;

const base = (path: string): string => path.split("/").filter(Boolean).pop() ?? path;

/** A path written relative to a folder, with its . and .. parts worked out. */
const resolveFrom = (folder: string, path: string): string => {
  const out: string[] = [];
  for (const part of (path.startsWith("/") ? path : `${folder}/${path}`).split("/")) {
    if (part === "..") out.pop();
    else if (part && part !== ".") out.push(part);
  }
  return `/${out.join("/")}`;
};

const readJj = async (exec: VcsExec): Promise<VcsInfo | null> => {
  const state = await readJjState((args) => exec("jj", args));
  if (state === null) return null;
  const root = await exec("jj", ["--ignore-working-copy", "--no-pager", "--color=never", "root"]);
  const top = root?.stdout.trim() ?? "";
  // A second workspace's .jj/repo is a file naming the main one's, relative to its .jj folder.
  const pointer = await exec("cat", [`${top}/.jj/repo`]);
  const repo =
    pointer?.code === 0 && pointer.stdout.trim()
      ? resolveFrom(`${top}/.jj`, pointer.stdout.trim())
      : `${top}/.jj/repo`;
  const name = base(repo.replace(/\/\.jj\/repo$/, ""));
  return "change" in state
    ? { repo: name, branch: `@${state.change}`, ahead: 0, behind: 0 }
    : { repo: name, branch: state.bookmark, ahead: state.ahead, behind: 0 };
};

const readGit = async (exec: VcsExec): Promise<VcsInfo | null> => {
  const [top, common] = await Promise.all([
    exec("git", ["rev-parse", "--path-format=absolute", "--show-toplevel"]),
    exec("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"]),
  ]);
  if (top?.code !== 0 || common?.code !== 0) return null;
  const repo = common.stdout.replace(/\n$/, "");
  const [branch, counts] = await Promise.all([
    exec("git", ["symbolic-ref", "-q", "HEAD"]),
    exec("git", ["rev-list", "--left-right", "--count", "HEAD...@{upstream}"]),
  ]);
  const [ahead = 0, behind = 0] =
    counts?.code === 0 ? counts.stdout.trim().split(/\s+/).map(Number) : [0, 0];
  return {
    repo: repo.endsWith("/.git") ? base(repo.slice(0, -5)) : base(repo).replace(/\.git$/, ""),
    branch: branch?.code === 0 ? branch.stdout.trim().replace(/^refs\/heads\//, "") : "(detached)",
    ahead,
    behind,
  };
};

/** The folder's version control, or null when it is in no repository (or none could be read). */
export const readVcsInfo = async (exec: VcsExec): Promise<VcsInfo | null> =>
  (await readJj(exec)) ?? (await readGit(exec));
