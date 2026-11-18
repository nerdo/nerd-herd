import type { HexColor } from "../colors/overlayColor";
import type { BannerFile, BannerState } from "../banners/bannerCache";
import type { ControlAlign, SpacesRow } from "../groups/groupModel";

type GroupRow = Extract<SpacesRow, { kind: "group" }>;
/** A control drawn on a group's header, in drawn order. */
export type HeaderControl = "count" | "cog" | "plus" | "chevron";

/** What a group's header draws: its banner with the controls on it, or its plain row. */
export type GroupHeaderLook =
  | {
      readonly kind: "banner";
      readonly file: BannerFile;
      readonly align: ControlAlign;
      readonly controls: readonly HeaderControl[];
      /** The strip behind the controls; null: none. */
      readonly backingColor: HexColor | null;
      /** The controls' color; null: the theme's. */
      readonly controlsColor: HexColor | null;
    }
  | {
      readonly kind: "row";
      readonly controls: readonly HeaderControl[];
      readonly card: string | null;
    };

/**
 * A loaded banner takes the place of the group's row and carries its controls: the count while
 * folded, the cog, the +, and the chevron unless the group hides it. While the banner loads, or
 * when it failed, the plain row shows, with the failure's message as a card beneath it.
 */
export const groupHeaderLook = (row: GroupRow, banner: BannerState): GroupHeaderLook => {
  const count: HeaderControl[] = row.folded ? ["count"] : [];
  if (banner.kind === "ready")
    return {
      kind: "banner",
      file: banner.file,
      align: row.align,
      backingColor: row.backingColor,
      controlsColor: row.controlsColor,
      controls: [...count, "cog", "plus", ...(row.chevron ? (["chevron"] as const) : [])],
    };
  return {
    kind: "row",
    controls: [...count, "cog", "plus", "chevron"],
    card: banner.kind === "failed" ? banner.message : null,
  };
};
