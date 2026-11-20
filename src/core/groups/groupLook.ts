// What a panel draws for a group: one of its banner styles' images, or the folder with its icon.
import type { BannerLink } from "../banners/bannerCache";
import type { HexColor } from "../colors/overlayColor";
import type { ControlAlign, SavedGroup } from "./groupModel";

export type Panel = "spaces" | "agents";
export type GroupLook =
  | { readonly kind: "banner"; readonly link: BannerLink }
  | { readonly kind: "folder" };

/** A banner style's image for the state, or its only image; with no image, the folder. */
const styleLook = (
  openLink: BannerLink | null,
  foldedLink: BannerLink | null,
  folded: boolean,
): GroupLook => {
  const link = folded ? (foldedLink ?? openLink) : (openLink ?? foldedLink);
  return link === null ? { kind: "folder" } : { kind: "banner", link };
};

/** Today's rule: the first banner style's image, else the folder. */
const defaultLook = (g: SavedGroup, folded: boolean): GroupLook =>
  styleLook(g.openBanner, g.foldedBanner, folded);

/** The look a Show as choice names; null for a choice that names none (absent or unknown). */
const chosenLook = (
  choice: string | undefined,
  g: SavedGroup,
  folded: boolean,
): GroupLook | null => {
  switch (choice) {
    case "folder":
      return { kind: "folder" };
    case "banner":
      return styleLook(g.openBanner, g.foldedBanner, folded);
    case "second":
      return styleLook(g.secondOpenBanner ?? null, g.secondFoldedBanner ?? null, folded);
    default:
      return null;
  }
};

const spacesLook = (g: SavedGroup, folded: boolean): GroupLook =>
  chosenLook(g.spacesLook, g, folded) ?? defaultLook(g, folded);

export const groupLook = (group: SavedGroup, panel: Panel, folded: boolean): GroupLook =>
  panel === "spaces"
    ? spacesLook(group, folded)
    : (chosenLook(group.agentsLook, group, folded) ?? spacesLook(group, folded));

/** Where Agents draws the strip on a group's banner, and in which colors. */
export interface AgentsOverlay {
  readonly align: ControlAlign;
  readonly backingColor: HexColor | null;
  readonly controlsColor: HexColor | null;
}

/** Agents' strip: each of its settings the group has not set for Agents follows Spaces'. */
export const agentsOverlay = (g: SavedGroup): AgentsOverlay => ({
  align: g.agentsAlign ?? g.align,
  backingColor: g.agentsBackingColor === undefined ? g.backingColor : g.agentsBackingColor,
  controlsColor: g.agentsControlsColor === undefined ? g.controlsColor : g.agentsControlsColor,
});
