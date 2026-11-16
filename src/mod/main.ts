import { v_flex } from "gpui-base";
import { type AsyncContext, div, View } from "gpui-kit";
import { checking, nextCommand, theme } from "herdr";
import type { SpacesRow } from "../core/groups/groupModel";
import { type App, createApp } from "./app";
import { herdrHost } from "./herdrHost";
import { themeColor } from "./themeColor";

const rowLabel = (row: SpacesRow): string =>
  row.kind === "group" ? row.id : (row.name ?? "This computer");

/** The nerd-herd Spaces view: hands each action to the app and draws the app's view model. */
export default class SpacesView extends View {
  app: App;

  init(_props: unknown, cx: AsyncContext): void {
    this.app = createApp(herdrHost);
    if (checking()) return;
    cx.spawn(async (cx) => {
      for (;;) {
        this.app.apply(await nextCommand());
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
      .child(div().child(`New ${vm.settings.groupWord.singular}`))
      .children(vm.rows.map((row) => div().child(rowLabel(row))));
  }
}
