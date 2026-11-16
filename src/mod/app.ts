import { createBannerCache } from "../core/banners/bannerCache";
import { groupRows } from "../core/groups/groupModel";
import type { ModAction } from "../core/modAction";
import { loadSettings } from "../core/settings/sidebarSettings";
import { loadGroups } from "../core/store/savedGroupStore";

const banners = createBannerCache();

// STUB (walking skeleton): the composition root. Passes the actions to each branch and prefixes its name.
export const compose = (actions: readonly ModAction[]): string[] =>
  [
    loadGroups(actions),
    loadSettings(actions),
    `banners ${actions.filter((link) => banners.lookup(link).kind !== "none").length} of ${actions.length}`,
    groupRows(actions),
  ].map((line) => `STUB app > ${line}`);
