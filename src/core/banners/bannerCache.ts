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
}

// CROSSING (walking skeleton): real in shape, knows no banner yet.
export const createBannerCache = (): BannerCache => ({
  lookup: () => ({ kind: "none" }),
});
