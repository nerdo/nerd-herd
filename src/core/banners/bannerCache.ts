import { NerdHerdError } from "../errors/nerdHerdError";

/** A banner link the user pasted. */
export type BannerLink = string;
/** A path relative to Herdr's app folder, where Herdr's image() can load it. */
export type BannerPath = string;
export type Pixels = number;

export interface BannerFile {
  readonly path: BannerPath;
  readonly width: Pixels;
  readonly height: Pixels;
}

/** What the view can draw for a link right now: nothing yet, a file, or why it failed. */
export type BannerState =
  | { readonly kind: "none" }
  | { readonly kind: "ready"; readonly file: BannerFile }
  | { readonly kind: "failed"; readonly message: string };

export interface BannerCache {
  /** What is known about this link now; never waits. */
  lookup(link: BannerLink): BannerState;
  /** Fetches the link and records what came of it. */
  load(link: BannerLink): Promise<void>;
}

/** Remembers each link's banner state; the view reads it, and `load` fills it in. */
export const createBannerCache = (
  fetch: (link: BannerLink) => Promise<BannerFile>,
): BannerCache => {
  const states = new Map<BannerLink, BannerState>();
  return {
    lookup: (link) => states.get(link) ?? { kind: "none" },
    load: async (link) => {
      try {
        states.set(link, { kind: "ready", file: await fetch(link) });
      } catch (error) {
        if (!(error instanceof NerdHerdError)) throw error;
        states.set(link, { kind: "failed", message: error.message });
      }
    },
  };
};
