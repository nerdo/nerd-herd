import { h_flex, v_flex } from "gpui-base";
import { type AsyncContext, div, image, svg } from "gpui-kit";
import {
  checking,
  closeOverlay,
  layout,
  nextCommand,
  notify,
  openOverlay,
  props,
  theme,
} from "herdr";
import { ulid } from "ulid";
import { runCommands } from "../core/commands/commandLoop";
import type { GroupId, SpacesRow } from "../core/groups/groupModel";
import { bannerOffset, newGroupLabel } from "../core/presentation/spacesText";
import { type App, createApp } from "./app";
import { herdrHost } from "./herdrHost";
import { themeColor } from "./themeColor";
import { Spaces } from "./vendor/herdrSpaces.js";

type GroupRow = Extract<SpacesRow, { kind: "group" }>;
type UngroupedRow = Extract<SpacesRow, { kind: "ungrouped" }>;
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

/** The commands Herdr delivers to this mod, one at a time, for as long as it runs. */
async function* commands(): AsyncGenerator<string> {
  for (;;) yield await nextCommand();
}

/** A ULID for a new group. ulid cannot find a random source in Herdr's runtime by itself
 *  (`herdr-app check`, 2026-11-17: "Failed to find a reliable PRNG"), so it is given crypto's. */
const newGroupId = (): GroupId =>
  ulid(undefined, () => (crypto.getRandomValues(new Uint32Array(1))[0] ?? 0) / 2 ** 32);

/** The nerd-herd Spaces mod: Herdr's Spaces section with machines gathered into groups. */
export default class NerdHerdSpaces extends Spaces {
  app: App;

  init(initial: unknown, cx: AsyncContext): void {
    this.app = createApp(herdrHost, newGroupId);
    if (props()?.overlay) return;
    super.init(initial, cx);
    if (checking()) return;
    cx.spawn(async (cx) => {
      if (await this.app.loadBanners()) cx.notify();
      await runCommands(
        commands(),
        async (command) => {
          this.app.apply(command);
          cx.notify();
          if (await this.app.loadBanners()) cx.notify();
        },
        (error) => notify({ title: "nerd-herd", body: error.message, level: "error" }),
      );
    });
  }

  layoutRows(): readonly SpacesRow[] {
    return this.app.view().rows;
  }

  groupHeader(row: GroupRow, t: Theme) {
    const banners = this.app.view().banners;
    const state = row.banner ? banners.lookup(row.banner) : { kind: "none" as const };
    const head = h_flex()
      .id(`group-${row.id}`)
      .h(26)
      .flex_none()
      .px(8)
      .gap(7)
      .items_center()
      .rounded(6)
      .text_size(11)
      .text_color(themeColor(t, "dim"))
      .cursor_pointer()
      .hover((s) => s.bg(themeColor(t, "hover")))
      .on_click((_e, cx) => {
        this.app.apply(`group-fold:${JSON.stringify({ group: row.id, folded: !row.folded })}`);
        cx.notify();
      })
      .child(
        row.icon
          ? div().flex_none().child(row.icon.value)
          : svg("mods/workspace-chrome/folder.svg").size(13).flex_none(),
      )
      .child(div().flex_1().truncate().text_color(themeColor(t, "muted")).child(row.name))
      .when(row.folded, (el) => el.child(div().flex_none().child(String(row.count))))
      .child(
        svg(`mods/workspace-chrome/chevron-${row.folded ? "right" : "down"}.svg`)
          .size(11)
          .flex_none(),
      );
    const banner =
      state.kind === "ready"
        ? div()
            .w_full()
            .h(state.file.height)
            .flex_none()
            .overflow_x_hidden()
            .child(
              image(state.file.path)
                .w(state.file.width)
                .h(state.file.height)
                .flex_none()
                .ml(bannerOffset(state.file.width, bannerSpace(), row.clip)),
            )
        : state.kind === "failed"
          ? div()
              .flex_none()
              .mx(4)
              .p(8)
              .rounded(6)
              .border_1()
              .border_color(themeColor(t, "blocked"))
              .text_size(11)
              .text_color(themeColor(t, "foreground"))
              .child(state.message)
          : null;
    return v_flex()
      .flex_none()
      .ml(row.depth * 12)
      .gap(4)
      .child(head)
      .when(banner !== null, (el) => (banner ? el.child(banner) : el));
  }

  ungroupedHeader(row: UngroupedRow, t: Theme) {
    return h_flex()
      .h(26)
      .flex_none()
      .px(8)
      .items_center()
      .text_size(11)
      .text_color(themeColor(t, "dim"))
      .child(row.name);
  }

  headerTools(t: Theme) {
    return div()
      .id("spaces-settings")
      .size(26)
      .flex_none()
      .flex()
      .items_center()
      .justify_center()
      .rounded(6)
      .hover((s) => s.bg(themeColor(t, "hover")).text_color(themeColor(t, "foreground")))
      .on_click(() =>
        openOverlay({
          mod: "nerd-herd-spaces",
          kind: "dialog",
          width: 420,
          height: 320,
          props: { panel: "settings" },
        }),
      )
      .child(svg("mods/workspace-chrome/settings.svg").size(14));
  }

  belowHeader(t: Theme) {
    const word = this.app.view().settings.groupWord;
    return h_flex()
      .id("group-new")
      .h(28)
      .mx(8)
      .px(8)
      .gap(7)
      .items_center()
      .rounded(7)
      .text_size(12)
      .text_color(themeColor(t, "dim"))
      .hover((s) => s.bg(themeColor(t, "hover")).text_color(themeColor(t, "foreground")))
      .on_click(() =>
        openOverlay({
          mod: "nerd-herd-spaces",
          kind: "dialog",
          width: 420,
          height: 220,
          props: { panel: "new-group" },
        }),
      )
      .child(svg("mods/workspace-chrome/folder-plus.svg").size(12))
      .child(newGroupLabel(word));
  }

  render() {
    const panel = props()?.panel;
    if (panel === undefined) return super.render();
    const t = theme();
    return v_flex()
      .size_full()
      .p(18)
      .bg(themeColor(t, "popover"))
      .text_color(themeColor(t, "foreground"))
      .child(
        div()
          .text_size(15)
          .child(
            panel === "settings"
              ? "Spaces settings"
              : newGroupLabel(this.app.view().settings.groupWord),
          ),
      )
      .child(
        div()
          .id("panel-close")
          .pt(16)
          .text_color(themeColor(t, "dim"))
          .on_click(() => closeOverlay(props()?.overlay))
          .child("Close"),
      );
  }
}
