import { resolveBanners } from "../core/banners/bannerCache";
import { groupRows } from "../core/groups/groupModel";
import type { ModAction } from "../core/modAction";
import { loadSettings } from "../core/settings/sidebarSettings";
import { loadGroups } from "../core/store/savedGroupStore";

// STUB (walking skeleton): the composition root. Passes the actions to each branch and prefixes its name.
export const compose = (actions: readonly ModAction[]): string[] =>
  [loadGroups(actions), loadSettings(actions), resolveBanners(actions), groupRows(actions)].map(
    (line) => `STUB app > ${line}`,
  );
