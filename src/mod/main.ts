import { v_flex } from "gpui-base";
import { type AsyncContext, div, View } from "gpui-kit";
import { checking, nextCommand, theme } from "herdr";
import type { ModAction } from "../core/modAction";
import { type App, createApp } from "./app";
import { herdrHost } from "./herdrHost";
import { themeColor } from "./themeColor";

// STUB (walking skeleton): the Spaces mod view. Hands each action to the app, counts what it
// received, and draws what the app's view model holds, prefixed with its own name.
export default class SpacesView extends View {
  app: App;
  actions: ModAction[];

  init(_props: unknown, cx: AsyncContext): void {
    this.app = createApp(herdrHost);
    this.actions = [];
    if (checking()) return;
    cx.spawn(async (cx) => {
      for (;;) {
        const action = await nextCommand();
        this.actions.push(action);
        this.app.apply(action);
        cx.notify();
      }
    });
  }

  render() {
    const t = theme();
    const vm = this.app.view();
    return v_flex()
      .size_full()
      .bg(themeColor(t, "chrome"))
      .p(8)
      .gap(6)
      .text_size(12)
      .text_color(themeColor(t, "foreground"))
      .child(
        div().child(
          `STUB view > ${vm.rows.length} rows, ${vm.settings.groupWord.plural} (${this.actions.length} actions)`,
        ),
      );
  }
}
