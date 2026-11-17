import { type BannerCache, createBannerCache } from "../core/banners/bannerCache";
import { fetchBanner } from "../core/banners/fetchBanner";
import { fileHash } from "../core/banners/fileHash";
import { applyCommand } from "../core/commands/applyCommand";
import type { NerdHerdError } from "../core/errors/nerdHerdError";
import type { GroupId, SavedGroups, SpacesRow } from "../core/groups/groupModel";
import { computeRows } from "../core/groups/groupRows";
import { readSettings, type SidebarSettings } from "../core/settings/sidebarSettings";
import { createGroupStore } from "../core/store/savedGroupStore";
import { curlDownloader, herdrFiles } from "./bannerAdapters";
import type { Host } from "./herdrHost";

/** Where downloaded banners are kept, relative to Herdr's app folder; hidden, so saving one does not reload the mod. */
const bannerFolder = "mods/nerd-herd-spaces/.banners";
const settingsKey = "nerd-herd.settings";

/** Everything the Spaces view draws, computed from what Herdr saved. */
export interface SpacesViewModel {
  readonly rows: readonly SpacesRow[];
  /** The saved groups the rows were computed from, for the dialogs' current values. */
  readonly groups: SavedGroups;
  readonly settings: SidebarSettings;
  readonly banners: BannerCache;
  /** Saved data that could not be read, to show as error cards. */
  readonly problems: readonly NerdHerdError[];
}

export interface App {
  /** Applies one `<action>:<JSON>` command and saves the result. Throws CommandError or GroupNameError. */
  apply(command: string): void;
  view(): SpacesViewModel;
  /** Loads every banner link the groups use that has not loaded yet; true when any state changed. */
  loadBanners(): Promise<boolean>;
}

/** The composition root: wires the core units to Herdr. */
export function createApp(host: Host, newId: () => GroupId): App {
  const store = createGroupStore(host.shared);
  const banners = createBannerCache((link) =>
    fetchBanner(link, {
      downloader: curlDownloader,
      files: herdrFiles,
      hash: fileHash,
      folder: bannerFolder,
    }),
  );
  const read = () => {
    const groups = store.load();
    const settings = readSettings(host.shared.read(settingsKey));
    return { groups, settings };
  };
  return {
    apply: (command) => {
      const { groups, settings } = read();
      const next = applyCommand(
        { groups: groups.groups, settings: settings.settings },
        command,
        newId,
      );
      store.save(next.groups);
      host.shared.write(settingsKey, next.settings);
    },
    view: () => {
      const { groups, settings } = read();
      return {
        rows: computeRows(groups.groups, host.machines(), settings.settings),
        groups: groups.groups,
        settings: settings.settings,
        banners,
        problems: [groups.problem, settings.problem].flatMap((p) => (p ? [p] : [])),
      };
    },
    loadBanners: async () => {
      const links = read().groups.groups.groups.flatMap((g) => [g.openBanner, g.foldedBanner]);
      const waiting = [...new Set(links)].flatMap((l) =>
        l && banners.lookup(l).kind === "none" ? [l] : [],
      );
      for (const link of waiting) await banners.load(link);
      return waiting.length > 0;
    },
  };
}
