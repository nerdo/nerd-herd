import { div, type Element } from "gpui-kit";
import { themeColor } from "./themeColor";

/** A card with an error's message, outlined in the theme's blocked color. */
export const errorCard = (t: Record<string, string>, message: string): Element =>
  div()
    .flex_none()
    .mx(12)
    .my(4)
    .p(8)
    .rounded(6)
    .border_1()
    .border_color(themeColor(t, "blocked"))
    .text_size(11)
    .text_color(themeColor(t, "foreground"))
    .child(message);
