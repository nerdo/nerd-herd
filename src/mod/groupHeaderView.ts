import { h_flex, v_flex } from "gpui-base";
import { type AsyncContext, div, type Element, image, svg } from "gpui-kit";
import { layout } from "herdr";
import type { BannerState } from "../core/banners/bannerCache";
import type { SpacesRow } from "../core/groups/groupModel";
import { type GroupHeaderLook, groupHeaderLook } from "../core/presentation/groupHeaderLook";
import {
  bannerOffset,
  groupSettingsLabel,
  newGroupInsideLabel,
} from "../core/presentation/spacesText";
import type { GroupWord } from "../core/settings/sidebarSettings";
import { colorStrip } from "./bannerOverlay";
import { errorCard } from "./errorCard";
import { openMenu, openPanel } from "./panels/formParts";
import { themeColor } from "./themeColor";

type GroupRow = Extract<SpacesRow, { kind: "group" }>;
type Theme = Record<string, string>;

/** The sidebar's width in points, from the layout, less the list's side padding. */
const bannerSpace = (): number => {
  const find = (node: unknown): number => {
    if (typeof node !== "object" || node === null) return 0;
    if ("id" in node && node.id === "sidebar" && "size" in node) {
      const size = node.size;
      if (typeof size === "object" && size !== null && "px" in size && typeof size.px === "number")
        return size.px;
    }
    return Object.values(node).reduce((found: number, child: unknown) => found || find(child), 0);
  };
  return Math.max(0, (find(layout()) || 268) - 16);
};

/**
 * The controls at a group header's right, spaced like a machine row's "+", status dot, and
 * chevron (Herdr's Spaces mod: 8 points of padding, 7 between), so the "+" and the chevron line
 * up with the machine rows. The dot's place and a hidden chevron's place stay empty.
 */
const controls = (row: GroupRow, look: GroupHeaderLook, t: Theme, word: GroupWord): Element[] => {
  const has = (c: string) => look.controls.some((x) => x === c);
  // Each button is named in a tooltip, like the Spaces header's (the user's hand walk, 2026-11-17).
  const click = (id: string, tip: string, act: () => void, child: Element | string) =>
    div()
      .id(`${id}-${row.id}`)
      .flex_none()
      .tooltip(tip)
      .hover((s) => s.text_color(themeColor(t, "foreground")))
      // A press on a button is not a press on the row, so it does not start dragging the group (the
      // user, 2026-11-18: an outline showed on hover after using a banner's buttons).
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .on_click((_e, cx) => {
        cx.stop_propagation();
        act();
      })
      .child(child);
  return [
    ...(has("count") ? [div().flex_none().child(String(row.count))] : []),
    click(
      "group-settings",
      groupSettingsLabel(row.name),
      () => openPanel({ panel: "group-settings", group: row.id }),
      svg("mods/workspace-chrome/settings.svg").size(11),
    ),
    click(
      "group-add",
      newGroupInsideLabel(word, row.name),
      () => openPanel({ panel: "name", target: { kind: "new", parent: row.id } }),
      // The same folder-plus icon as the Spaces header's new-group button (the user, 2026-11-17).
      div().px(2).child(svg("mods/workspace-chrome/folder-plus.svg").size(11)),
    ),
    div().size(6).flex_none(),
    has("chevron")
      ? svg(`mods/workspace-chrome/chevron-${row.folded ? "right" : "down"}.svg`)
          .size(11)
          .flex_none()
      : div().size(11).flex_none(),
  ];
};

/** A group's header: its banner with the controls on it, or its plain row with an optional card. */
export const groupHeaderView = (
  row: GroupRow,
  banner: BannerState,
  t: Theme,
  word: GroupWord,
  fold: (cx: AsyncContext) => void,
  rail = false,
): Element => {
  if (rail)
    // In the narrow rail a group is its icon, named in a tooltip, like Herdr's machine cells.
    return h_flex()
      .id(`group-${row.id}`)
      .h(26)
      .mt(4)
      .flex_none()
      .justify_center()
      .items_center()
      .rounded(6)
      .text_color(themeColor(t, "dim"))
      .cursor_pointer()
      .hover((s) => s.bg(themeColor(t, "hover")))
      .tooltip(row.name)
      .on_click((_e, cx) => fold(cx))
      .child(
        row.icon ? div().child(row.icon.value) : svg("mods/workspace-chrome/folder.svg").size(13),
      );
  const look = groupHeaderLook(row, banner);
  const menu = () => openMenu({ kind: "group", group: row.id, name: row.name }, 4);
  const strip = h_flex().px(8).gap(7).items_center().text_size(11).text_color(themeColor(t, "dim"));
  if (look.kind === "banner") {
    const { file } = look;
    const place =
      look.align === "top" ? "items_start" : look.align === "bottom" ? "items_end" : "items_center";
    return div()
      .id(`group-${row.id}`)
      .relative()
      .flex_none()
      .ml(row.depth * 12)
      .h(file.height)
      .overflow_x_hidden()
      .cursor_pointer()
      .on_click((_e, cx) => fold(cx))
      .on_mouse_down("right", menu)
      .child(
        image(file.path)
          .w(file.width)
          .h(file.height)
          .flex_none()
          .ml(bannerOffset(file.width, bannerSpace(), row.clip)),
      )
      .child(
        h_flex()
          .absolute()
          .inset_0()
          [place]()
          .child(
            colorStrip(
              strip
                .flex_1()
                .h(26)
                .justify_end()
                .children(controls(row, look, t, word)),
              look,
            ),
          ),
      );
  }
  const head = strip
    .id(`group-${row.id}`)
    .h(26)
    .flex_none()
    .rounded(6)
    .cursor_pointer()
    .hover((s) => s.bg(themeColor(t, "hover")))
    .on_click((_e, cx) => fold(cx))
    .on_mouse_down("right", menu)
    .child(
      row.icon
        ? div().flex_none().child(row.icon.value)
        : svg("mods/workspace-chrome/folder.svg").size(13).flex_none(),
    )
    .child(div().flex_1().truncate().text_color(themeColor(t, "muted")).child(row.name))
    .children(controls(row, look, t, word));
  const card = look.card === null ? null : errorCard(t, look.card);
  return v_flex()
    .flex_none()
    .ml(row.depth * 12)
    .gap(4)
    .child(head)
    .when(card !== null, (el) => (card ? el.child(card) : el));
};
