// The Agents sort menu: a popup listing the sort choices, the current one marked; picking one saves it.
import { h_flex, v_flex } from "gpui-base";
import { div, type Element } from "gpui-kit";
import { closeOverlay, openOverlay } from "herdr";
import type { SortChoice } from "../../core/sessions/sortChoices";
import { themeColor } from "../themeColor";

type Theme = Record<string, string>;

export const openSortMenu = (): void => {
  openOverlay({
    mod: "nerd-herd-agents",
    kind: "popup",
    width: 220,
    height: 150,
    props: { sortMenu: true },
  });
};

export const sortMenu = (
  t: Theme,
  choices: readonly SortChoice[],
  current: unknown,
  pick: (id: string) => void,
  overlay: string | null,
): Element =>
  v_flex()
    .p(6)
    .gap(2)
    .child(
      div().px(8).pt(4).pb(6).text_size(11).text_color(themeColor(t, "dim")).child("Sort agents"),
    )
    .children(
      choices.map((c) =>
        h_flex()
          .id(`sort-${c.id}`)
          .h(28)
          .px(8)
          .rounded(6)
          .items_center()
          .justify_between()
          .cursor_pointer()
          .hover((s) => s.bg(themeColor(t, "hover")))
          .on_click(() => {
            pick(c.id);
            if (overlay) closeOverlay(overlay);
          })
          .child(div().text_color(themeColor(t, "foreground")).child(c.label))
          .child(
            div()
              .text_color(themeColor(t, "muted"))
              .child(c.id === current ? "✓" : ""),
          ),
      ),
    );
