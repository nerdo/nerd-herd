import { type AsyncContext, div, View } from "gpui-kit";
import { v_flex } from "gpui-base";
import { checking, nextCommand, theme } from "herdr";
import type { ModAction } from "../core/modAction";
import { compose } from "./app";
import { themeColor } from "./themeColor";

// STUB (walking skeleton): the Spaces mod view. Collects the actions sent to it and draws each
// branch's chain, prefixed with its own name.
export default class SpacesView extends View {
  actions: ModAction[];

  init(_props: unknown, cx: AsyncContext): void {
    this.actions = [];
    if (checking()) return;
    cx.spawn(async (cx) => {
      for (;;) {
        this.actions.push(await nextCommand());
        cx.notify();
      }
    });
  }

  render() {
    const t = theme();
    return v_flex()
      .size_full()
      .bg(themeColor(t, "chrome"))
      .p(8)
      .gap(6)
      .text_size(12)
      .text_color(themeColor(t, "foreground"))
      .children(compose(this.actions).map((line) => div().child(`STUB view > ${line}`)));
  }
}
