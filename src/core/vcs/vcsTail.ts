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

/** The label to draw: the branch text (cut to fit), the whole branch, and the counts; and the
 *  repository's name, which the space's name shows as its tooltip. */
export type VcsTail = {
  readonly repo: string;
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
 * name. The repository's name is never in the label: the space's name carries it as a tooltip
 * (Dannel, 2026-11-21: "that information belongs as a tooltip of the space name").
 */
export const vcsTail = (info: VcsInfo, o: { readonly place: string }): VcsTail => {
  const raw = info.branch ?? "detached";
  const same = raw.toLowerCase() === o.place.toLowerCase();
  const branch = same || raw === "master" || raw === "main" ? "" : raw;
  return {
    repo: info.repo,
    where: middleEllipsis(branch, room),
    whole: branch,
    ahead: info.ahead,
    behind: info.behind,
  };
};
