// A banner's overlay colors (the user, 2026-11-18): the backing fills the strip behind the
// controls, and the controls color draws them. The sidebar and the settings dialog's preview both
// color their strip here, so the preview shows what the sidebar will draw.
import { h_flex } from "gpui-base";
import { div, type Element, image, svg } from "gpui-kit";
import type { HexColor } from "../core/colors/overlayColor";
import type { BannerFile } from "../core/banners/bannerCache";
import type { ClipSide, ControlAlign } from "../core/groups/groupModel";
import { bannerOffset } from "../core/presentation/spacesText";

export interface OverlayColors {
  readonly backingColor: HexColor | null;
  readonly controlsColor: HexColor | null;
}

/** Colors a strip of controls: each color set replaces what the strip had (none, the theme's). */
export const colorStrip = (strip: Element, colors: OverlayColors): Element => {
  const { backingColor, controlsColor } = colors;
  return strip
    .when(backingColor !== null, (el) => el.bg(backingColor ?? "#00000000"))
    .when(controlsColor !== null, (el) => el.text_color(controlsColor ?? "#00000000"));
};

/**
 * The settings dialog's preview: the group's banner as the sidebar draws it, `width` points wide,
 * with the gear, the +, and the chevron on a strip in the colors the dialog holds now.
 */
export const overlayPreview = (
  file: BannerFile,
  width: number,
  look: { readonly align: ControlAlign; readonly clip: ClipSide; readonly dim: HexColor },
  colors: OverlayColors,
): Element => {
  const place =
    look.align === "top" ? "items_start" : look.align === "bottom" ? "items_end" : "items_center";
  const icon = (name: string) => svg(`mods/workspace-chrome/${name}.svg`).size(11).flex_none();
  const strip = h_flex()
    .flex_1()
    .h(26)
    .px(8)
    .gap(7)
    .items_center()
    .justify_end()
    .text_color(look.dim)
    .child(icon("settings"))
    .child(div().px(2).child(icon("folder-plus")))
    .child(div().size(6).flex_none())
    .child(icon("chevron-down"));
  return div()
    .id("overlay-preview")
    .relative()
    .w(width)
    .h(file.height)
    .overflow_x_hidden()
    .rounded(6)
    .child(
      image(file.path)
        .w(file.width)
        .h(file.height)
        .flex_none()
        .ml(bannerOffset(file.width, width, look.clip)),
    )
    .child(h_flex().absolute().inset_0()[place]().child(colorStrip(strip, colors)));
};
