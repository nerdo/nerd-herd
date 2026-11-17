import { h_flex, v_flex } from "gpui-base";
import type { Element } from "gpui-kit";
import { div } from "gpui-kit";
import { themeColor } from "./themeColor";

/** One of the card's buttons. */
const cardButton = (t: Record<string, string>, id: string, label: string, act: () => void) =>
  div()
    .id(id)
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
      act();
      cx.notify();
    })
    .child(label);

/** A card with an error's message, outlined in the theme's blocked color; buttons for the actions given. */
export const errorCard = (
  t: Record<string, string>,
  message: string,
  actions: { retry?: () => void; dismiss?: () => void } = {},
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
    .when(actions.retry !== undefined || actions.dismiss !== undefined, (el) =>
      el.child(
        h_flex()
          .gap(6)
          .when(actions.retry !== undefined, (row) =>
            row.child(cardButton(t, "error-retry", "Try again", () => actions.retry?.())),
          )
          .when(actions.dismiss !== undefined, (row) =>
            row.child(cardButton(t, "error-dismiss", "Dismiss", () => actions.dismiss?.())),
          ),
      ),
    );
