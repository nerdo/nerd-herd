import { h_flex } from "gpui-base";
import { type AsyncContext, div, type Element, type FocusHandle, svg } from "gpui-kit";
import { checking, nextCommand, notify, props, theme } from "herdr";
import { ulid } from "ulid";
import { runCommands } from "../core/commands/commandLoop";
import type { GroupId, SpacesRow } from "../core/groups/groupModel";
import {
  isKeyCommand,
  type KeyCommand,
  type KeyState,
  keyStep,
  type RowKey,
} from "../core/keyboard/keyStep";
import { newGroupLabel } from "../core/presentation/spacesText";
import { type App, createApp } from "./app";
import { groupHeaderView } from "./groupHeaderView";
import { herdrHost } from "./herdrHost";
import { openMenu, openPanel, type Panel } from "./panels/formParts";
import { panelFor } from "./panels/panelFor";
import { marked } from "./rowMark";
import { themeColor } from "./themeColor";
import { Spaces } from "./vendor/herdrSpaces.js";

type GroupRow = Extract<SpacesRow, { kind: "group" }>;
type UngroupedRow = Extract<SpacesRow, { kind: "ungrouped" }>;
type Theme = Record<string, string>;

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
  /** Set when this view is one of the mod's dialogs or popups rather than the sidebar. */
  panel: Panel | null = null;
  /** The keyboard's focused row and cut row. */
  keys: KeyState = { focused: null, cut: null };
  keyboard: FocusHandle;

  init(initial: unknown, cx: AsyncContext): void {
    this.app = createApp(herdrHost, newGroupId);
    if (props()?.overlay) {
      this.panel = panelFor(props(), this.app.view(), cx);
      return;
    }
    super.init(initial, cx);
    this.keyboard = cx.focus_handle();
    if (checking()) return;
    cx.spawn(async (cx) => {
      if (await this.app.loadBanners()) cx.notify();
      await runCommands(
        commands(),
        async (command) => {
          if (command === "focus") {
            this.keyboard.focus();
            return;
          }
          if (isKeyCommand(command)) {
            this.key(command);
            cx.notify();
            return;
          }
          this.app.apply(command);
          cx.notify();
          if (await this.app.loadBanners()) cx.notify();
        },
        (error) => notify({ title: "nerd-herd", body: error.message, level: "error" }),
      );
    });
  }

  /** Applies one key from the mod's keys.json section. */
  key(command: KeyCommand): void {
    const view = this.app.view();
    const { state, effect } = keyStep(this.keys, view.rows, view.groups, command);
    this.keys = state;
    if (effect?.kind === "command") this.app.apply(effect.command);
    if (effect?.kind === "rename") {
      const name = view.groups.groups.find((g) => g.id === effect.group)?.name ?? "";
      openPanel({ panel: "name", target: { kind: "group", group: effect.group, name } }, 200);
    }
  }

  /** How a row the keyboard holds is marked: focused, cut, or neither. */
  mark(row: RowKey): "focused" | "cut" | null {
    const is = (k: RowKey | null) =>
      k !== null &&
      (k.kind === "group"
        ? row.kind === "group" && row.id === k.id
        : row.kind === "machine" && row.name === k.name);
    return is(this.keys.focused) ? "focused" : is(this.keys.cut) ? "cut" : null;
  }

  machineHead(name: string | null, head: Element, t: Theme): Element {
    return marked(head, this.mark({ kind: "machine", name }), t);
  }

  layoutRows(): readonly SpacesRow[] {
    return this.app.view().rows;
  }

  groupHeader(row: GroupRow, t: Theme) {
    const banner = row.banner
      ? this.app.view().banners.lookup(row.banner)
      : { kind: "none" as const };
    const view = groupHeaderView(row, banner, t, (cx) => {
      this.app.apply(`group-fold:${JSON.stringify({ group: row.id, folded: !row.folded })}`);
      cx.notify();
    });
    return marked(view, this.mark({ kind: "group", id: row.id }), t);
  }

  ungroupedHeader(row: UngroupedRow, t: Theme) {
    return h_flex()
      .id("ungrouped-header")
      .h(26)
      .flex_none()
      .px(8)
      .items_center()
      .text_size(11)
      .text_color(themeColor(t, "dim"))
      .on_mouse_down("right", () => openMenu({ kind: "ungrouped", name: row.name }, 1))
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
      .on_click(() => openPanel({ panel: "spaces-settings" }, 420))
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
      .on_click(() => openPanel({ panel: "name", target: { kind: "new", parent: null } }, 200))
      .child(svg("mods/workspace-chrome/folder-plus.svg").size(12))
      .child(newGroupLabel(word));
  }

  render() {
    if (props()?.overlay === undefined)
      return div().size_full().track_focus(this.keyboard).child(super.render());
    const t = theme();
    return this.panel
      ? this.panel.render(t)
      : div().size_full().p(18).bg(themeColor(t, "popover")).child("Nothing to show here.");
  }
}
