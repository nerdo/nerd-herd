import { createBannerCache } from "../core/banners/bannerCache";
import { groupRows } from "../core/groups/groupModel";
import type { ModAction } from "../core/modAction";
import { readSettings } from "../core/settings/sidebarSettings";
import { createGroupStore } from "../core/store/savedGroupStore";

const banners = createBannerCache();
const memory = new Map<string, unknown>();
const store = createGroupStore({
  read: (key) => memory.get(key),
  write: (key, value) => memory.set(key, value),
});

// STUB (walking skeleton): the composition root. Passes the actions to each branch and prefixes its name.
export const compose = (actions: readonly ModAction[]): string[] =>
  [
    `store ${store.load().groups.length} groups (${actions.length} actions)`,
    `settings ${readSettings(actions).groupWord.plural} (${actions.length} actions)`,
    `banners ${actions.filter((link) => banners.lookup(link).kind !== "none").length} of ${actions.length}`,
    groupRows(actions),
  ].map((line) => `STUB app > ${line}`);
