import type { Pixels } from "../banners/bannerCache";
import type { ClipSide, GroupNameError } from "../groups/groupModel";
import type { GroupWord } from "../settings/sidebarSettings";

/** The new-group button's label in the user's word for groups, e.g. "New environment". */
export const newGroupLabel = (word: GroupWord): string => `New ${word.singular.toLowerCase()}`;

/** A refused group name's message, rendered from the error's fields in the user's word. */
export const groupNameMessage = (error: GroupNameError, word: GroupWord): string =>
  error.reason === "empty"
    ? `Enter a name for the ${word.singular.toLowerCase()}.`
    : `${word.singular} names can be at most ${error.limit} characters. This one has ${error.length}.`;

/** Where a banner\'s left edge sits in its header: the left edge shows, or it is centered so both sides clip equally. */
export const bannerOffset = (image: Pixels, space: Pixels, clip: ClipSide): Pixels =>
  clip === "center" && image > space ? -Math.round((image - space) / 2) : 0;
