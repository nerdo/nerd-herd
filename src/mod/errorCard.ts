import { h_flex, v_flex } from "gpui-base";
import type { Element } from "gpui-kit";
import { div } from "gpui-kit";
import { themeColor } from "./themeColor";

/** A card with an error's message, outlined in the theme's blocked color; with `retry`, a Try again button. */
export const errorCard = (
  t: Record<string, string>,
  message: string,
  retry?: () => void,
): Element =>
  v_flex()
    .flex_none()
    .mx(12)
    .my(4)
    .p(8)
    .gap(6)
    .rounded(6)
    .border_1()
    .border_color(themeColor(t, "blocked"))
    .text_size(11)
    .text_color(themeColor(t, "foreground"))
    .child(div().child(message))
    .when(retry !== undefined, (el) =>
      el.child(
        h_flex().child(
          div()
            .id("error-retry")
            .px(8)
            .h(22)
            .flex()
            .items_center()
            .rounded(5)
            .border_1()
            .border_color(themeColor(t, "input"))
            .cursor_pointer()
            .hover((s) => s.bg(themeColor(t, "hover")))
            .on_click((_e, cx) => {
              retry?.();
              cx.notify();
            })
            .child("Try again"),
        ),
      ),
    );
