import { type BannerCache, createBannerCache } from "../core/banners/bannerCache";
import { computeRows, type SpacesRow } from "../core/groups/groupModel";
import type { ModAction } from "../core/modAction";
import { readSettings, type SidebarSettings } from "../core/settings/sidebarSettings";
import { createGroupStore } from "../core/store/savedGroupStore";
import type { Host } from "./herdrHost";

/** Everything the Spaces view draws, computed from what Herdr saved. */
export interface SpacesViewModel {
  readonly rows: readonly SpacesRow[];
  readonly settings: SidebarSettings;
  readonly banners: BannerCache;
}

export interface App {
  /** Applies one action sent to the mod. */
  apply(action: ModAction): void;
  view(): SpacesViewModel;
}

/** The composition root: wires the core units to Herdr. */
export function createApp(host: Host): App {
  const store = createGroupStore(host.shared);
  const banners = createBannerCache();
  return {
    // CROSSING (walking skeleton): actions change nothing yet.
    apply: () => {},
    view: () => {
      const settings = readSettings(host.shared.read("nerd-herd.settings"));
      return { rows: computeRows(store.load(), host.machines(), settings), settings, banners };
    },
  };
}
