import { home } from "herdr";
import { type BannerCache, createBannerCache } from "../core/banners/bannerCache";
import { fetchBanner } from "../core/banners/fetchBanner";
import { fileHash } from "../core/banners/fileHash";
import { applyCommand } from "../core/commands/applyCommand";
import type { NerdHerdError } from "../core/errors/nerdHerdError";
import { bannersToLoad, keepBannerFile } from "../core/groups/groupActions";
import type { GroupId, SavedGroups, SpacesRow } from "../core/groups/groupModel";
import { computeRows } from "../core/groups/groupRows";
import { createSettingsStore } from "../core/settings/settingsStore";
import type { SidebarSettings } from "../core/settings/sidebarSettings";
import { createGroupStore } from "../core/store/savedGroupStore";
import { curlDownloader, herdrFiles, herdrLocalFiles } from "./bannerAdapters";
import type { Host } from "./herdrHost";

/** Where downloaded banners are kept, relative to Herdr's app folder; hidden, so saving one does not reload the mod. */
const bannerFolder = "mods/nerd-herd-spaces/.banners";

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
  /** Reads backed-up saved data again, restoring what can be read now. True when anything was restored. */
  retry(): boolean;
  /** Hides the saved-data problems' cards; the backups are kept for Try again. */
  dismiss(): void;
}

/** The composition root: wires the core units to Herdr. */
export function createApp(host: Host, newId: () => GroupId): App {
  const store = createGroupStore(host.shared);
  const settingsStore = createSettingsStore(host.shared);
  const banners = createBannerCache((link) =>
    fetchBanner(link, {
      downloader: curlDownloader,
      files: herdrFiles,
      localFiles: herdrLocalFiles,
      home: home(),
      hash: fileHash,
      folder: bannerFolder,
    }),
  );
  const read = () => {
    const groups = store.load();
    const settings = settingsStore.load();
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
      settingsStore.save(next.settings);
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
    retry: () => {
      const groups = store.retry();
      const settings = settingsStore.retry();
      return groups || settings;
    },
    dismiss: () => {
      store.dismiss();
      settingsStore.dismiss();
    },
    // Each banner link is loaded once and its copy kept with the group (the user, 2026-11-17: "embed
    // the images"); a link that failed is tried again only after Herdr restarts.
    loadBanners: async () => {
      const waiting = bannersToLoad(store.load().groups).filter(
        (l) => banners.lookup(l).kind === "none",
      );
      for (const link of waiting) {
        await banners.load(link);
        const state = banners.lookup(link);
        if (state.kind === "ready")
          store.save(keepBannerFile(store.load().groups, link, state.file));
      }
      return waiting.length > 0;
    },
  };
}
