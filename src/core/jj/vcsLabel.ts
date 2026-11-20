// A session's version control label: the jj bookmark at or below its working copy with the non-empty
// changes since it ("main ↑2"), or @<change id> with no bookmark, or else its git branch.

/** Runs jj with these arguments in the session's folder, on its machine; null when it cannot run. */
export type JjRun = (args: readonly string[]) => Promise<{ code: number; stdout: string } | null>;

export type JjState =
  | { readonly bookmark: string; readonly ahead: number }
  | { readonly change: string };

const quiet = ["--ignore-working-copy", "--no-pager", "--color=never"];
const template =
  'change_id.shortest(8) ++ "\\t" ++ local_bookmarks.map(|b| b.name()).join(" ") ++ "\\n"';

/** The jj state of a folder, read as the Spaces jj label reads it; null when it is not jj. */
export const readJjState = async (jj: JjRun): Promise<JjState | null> => {
  const run = (args: readonly string[]) => jj([...quiet, ...args]).catch(() => null);
  const root = await run(["root"]);
  if (root?.code !== 0) return null;
  const near = await run(["log", "-r", "heads(::@ & bookmarks())", "--no-graph", "-T", template]);
  const bookmark =
    near?.code === 0 ? near.stdout.split("\n")[0]?.split("\t")[1]?.split(" ")[0] : undefined;
  if (bookmark) {
    const since = await run([
      "log",
      "-r",
      "heads(::@ & bookmarks())..@ ~ empty()",
      "--no-graph",
      "-T",
      '"x"',
    ]);
    return { bookmark, ahead: since?.code === 0 ? since.stdout.trim().length : 0 };
  }
  const at = await run(["log", "-r", "@", "--no-graph", "-T", template]);
  const change = at?.code === 0 ? (at.stdout.split("\t")[0] ?? "").trim() : "";
  return change ? { change } : null;
};

/** The label a card shows: "main ↑2", "main", "@<change id>", else the git branch; null for none. */
export const vcsLabel = (jj: JjState | null, gitBranch: string | null): string | null => {
  if (jj === null) return gitBranch;
  if ("change" in jj) return `@${jj.change}`;
  return jj.ahead > 0 ? `${jj.bookmark} ↑${jj.ahead}` : jj.bookmark;
};
