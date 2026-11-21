// Whether a checkout sits under its repository's main checkout, as Herdr's Spaces nests a second
// checkout's space under the main checkout's space.

import type { VcsInfo } from "./vcsTail";

/** A folder's version control, on the machine it was read on (null: this computer). */
export type Located = { readonly machine: string | null; readonly info: VcsInfo };

const key = (l: Located): string | null =>
  l.info.checkout ? JSON.stringify([l.machine, l.info.checkout.path]) : null;

/** True when the target is a second checkout and its repository's main checkout, on the same
 *  machine, is the folder of one of the spaces. */
export const nestedCheckout = (target: Located, spaces: readonly Located[]): boolean =>
  target.info.checkout?.linked === true &&
  spaces.some((s) => s.info.checkout?.linked === false && key(s) === key(target));
