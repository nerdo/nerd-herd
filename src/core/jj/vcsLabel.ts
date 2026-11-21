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
  const parts = vcsParts(jj, gitBranch);
  return parts === null ? null : vcsText(parts);
};

/** The whole label for a name and the changes ahead of it: "main ↑2", or the name alone. */
export const vcsText = (parts: VcsParts): string =>
  parts.ahead > 0 ? `${parts.name} ↑${parts.ahead}` : parts.name;

export type VcsParts = { readonly name: string; readonly ahead: number };

/** The label's name and the changes ahead of it, apart, so a card can cut a long name short. */
export const vcsParts = (jj: JjState | null, gitBranch: string | null): VcsParts | null => {
  if (jj === null) return gitBranch === null ? null : { name: gitBranch, ahead: 0 };
  if ("change" in jj) return { name: `@${jj.change}`, ahead: 0 };
  return { name: jj.bookmark, ahead: jj.ahead };
};

/** The name cut to at most `room` characters, keeping its start and its end around an ellipsis. */
export const middleEllipsis = (name: string, room: number): string => {
  const chars = [...name];
  if (chars.length <= room) return name;
  const kept = room - 1;
  const head = Math.ceil(kept / 2);
  return `${chars.slice(0, head).join("")}…${chars.slice(chars.length - (kept - head)).join("")}`;
};
