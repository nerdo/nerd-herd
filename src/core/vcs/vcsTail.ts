// The version control label drawn after a space's name, in Spaces' rows and on Agents' cards alike:
// only what is unusual, as Herdr's Spaces shows it.

import { middleEllipsis } from "../jj/vcsLabel";

/** What a folder's version control says: its repository's name, branch, and counts. */
export type VcsInfo = {
  readonly repo: string;
  readonly branch: string | null;
  readonly ahead: number;
  readonly behind: number;
};

/** The label to draw: the name text (cut to fit), the whole name, and the counts. */
export type VcsTail = {
  readonly where: string;
  readonly whole: string;
  readonly ahead: number;
  readonly behind: number;
};

/** The most characters the name takes before it is cut in its middle: about what a space's row in
 *  Spaces has room for beside the space's name. */
const room = 20;

/**
 * The label for a space named `place`. A branch goes when it is main or master or the space's own
 * name; the repository goes when it is the space's name, or when the space is nested under its
 * repository's main checkout, whose row already names it.
 */
export const vcsTail = (
  info: VcsInfo,
  o: { readonly place: string; readonly nested: boolean },
): VcsTail => {
  const same = (a: string) => a.toLowerCase() === o.place.toLowerCase();
  const raw = info.branch ?? "detached";
  const branch = same(raw) || raw === "master" || raw === "main" ? "" : raw;
  const repo = o.nested || same(info.repo) ? "" : info.repo;
  const whole = [repo, branch].filter(Boolean).join(" · ");
  return { where: middleEllipsis(whole, room), whole, ahead: info.ahead, behind: info.behind };
};
