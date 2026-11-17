import { h_flex, v_flex } from "gpui-base";
import { type AsyncContext, div, type Element, type FocusHandle, svg } from "gpui-kit";
import { checking, nextCommand, notify, props, theme } from "herdr";
import { ulid } from "ulid";
import { CommandError } from "../core/commands/applyCommand";
import { runCommands } from "../core/commands/commandLoop";
import { type DropZone, dropCommand } from "../core/groups/dropCommand";
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
import { errorCard } from "./errorCard";
import { groupHeaderView } from "./groupHeaderView";
import { herdrHost } from "./herdrHost";
import { openMenu, openPanel, type Panel } from "./panels/formParts";
import { openFromCommand, panelFor } from "./panels/panelFor";
import { marked, type RowMark } from "./rowMark";
import { themeColor } from "./themeColor";
import { Spaces } from "./vendor/herdrSpaces.js";

type GroupRow = Extract<SpacesRow, { kind: "group" }>;
type UngroupedRow = Extract<SpacesRow, { kind: "ungrouped" }>;
type Theme = Record<string, string>;

const sameRow = (a: RowKey, b: RowKey): boolean =>
  a.kind === "group"
    ? b.kind === "group" && a.id === b.id
    : b.kind === "machine" && a.name === b.name;

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
  /** The row being dragged, and where it would land if dropped now. */
  drag: { source: RowKey; over: { target: RowKey; zone: DropZone } | null } | null = null;

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
          if (command === "data-retry") {
            this.retryData();
            cx.notify();
            if (await this.app.loadBanners()) cx.notify();
            return;
          }
          if (command.startsWith("open:")) {
            if (!openFromCommand(JSON.parse(command.slice(5)), this.app.view()))
              throw new CommandError(command);
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

  /** Lets a row be dragged and dropped on: down starts a drag, moving picks the zone, up drops. */
  draggable(el: Element, row: RowKey): Element {
    return el
      .on_mouse_down("left", () => {
        this.drag = { source: row, over: null };
      })
      .on_mouse_move((e, cx) => {
        if (!this.drag) return;
        const zone: DropZone = e.local_position.y < e.bounds.height * 0.3 ? "before" : "onto";
        const over = this.drag.over;
        if (over && sameRow(over.target, row) && over.zone === zone) return;
        this.drag = { ...this.drag, over: { target: row, zone } };
        cx.notify();
      })
      .on_mouse_up("left", (_e, cx) => {
        const drag = this.drag;
        this.drag = null;
        if (!drag) return;
        const zone = drag.over && sameRow(drag.over.target, row) ? drag.over.zone : "onto";
        const effect = dropCommand(drag.source, row, zone, this.app.view().groups);
        if (effect) this.app.apply(effect.command);
        cx.notify();
      });
  }

  /** How a row is marked: keyboard focus, cut, where a drag would land, or nothing. */
  mark(row: RowKey): RowMark {
    const over = this.drag?.over;
    if (over && this.drag && !sameRow(this.drag.source, row) && sameRow(over.target, row))
      return over.zone === "before" ? "drop-before" : "drop-onto";
    const is = (k: RowKey | null) =>
      k !== null &&
      (k.kind === "group"
        ? row.kind === "group" && row.id === k.id
        : row.kind === "machine" && row.name === k.name);
    return is(this.keys.focused) ? "focused" : is(this.keys.cut) ? "cut" : null;
  }

  machineHead(name: string | null, head: Element, t: Theme): Element {
    const row: RowKey = { kind: "machine", name };
    return marked(this.draggable(head, row), this.mark(row), t);
  }

  layoutRows(): readonly SpacesRow[] {
    return this.app.view().rows;
  }

  groupHeader(row: GroupRow, t: Theme, rail: boolean) {
    const banner = row.banner
      ? this.app.view().banners.lookup(row.banner)
      : { kind: "none" as const };
    const view = groupHeaderView(
      row,
      banner,
      t,
      (cx) => {
        this.app.apply(`group-fold:${JSON.stringify({ group: row.id, folded: !row.folded })}`);
        cx.notify();
      },
      rail,
    );
    const key: RowKey = { kind: "group", id: row.id };
    return marked(this.draggable(view, key), this.mark(key), t);
  }

  ungroupedHeader(row: UngroupedRow, t: Theme, rail: boolean) {
    if (rail) return div();
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

  /** The header's buttons before Herdr's "+": Spaces settings, then a new group; each named in a tooltip. */
  headerTools(t: Theme) {
    const word = this.app.view().settings.groupWord;
    const button = (id: string, icon: string, tip: string, act: () => void) =>
      div()
        .id(id)
        .size(26)
        .flex_none()
        .flex()
        .items_center()
        .justify_center()
        .rounded(6)
        .hover((s) => s.bg(themeColor(t, "hover")).text_color(themeColor(t, "foreground")))
        .tooltip(tip)
        .on_click(() => act())
        .child(svg(`mods/workspace-chrome/${icon}.svg`).size(14));
    return h_flex()
      .flex_none()
      .child(
        button("spaces-settings", "settings", "Spaces settings", () =>
          openPanel({ panel: "spaces-settings" }, 420),
        ),
      )
      .child(
        button("group-new", "folder-plus", newGroupLabel(word), () =>
          openPanel({ panel: "name", target: { kind: "new", parent: null } }, 200),
        ),
      );
  }

  /** Below the header: a card for each saved-data problem, with a button to read the data again. */
  belowHeader(t: Theme) {
    return v_flex()
      .flex_none()
      .children(
        this.app.view().problems.map((p) => errorCard(t, p.message, () => this.retryData())),
      );
  }

  /** Reads backed-up saved data again (the error card's Try again, or the data-retry command). */
  retryData(): void {
    this.app.retry();
  }

  render() {
    if (props()?.overlay === undefined)
      return div()
        .size_full()
        .track_focus(this.keyboard)
        .on_mouse_up("left", (_e, cx) => {
          if (!this.drag) return;
          this.drag = null;
          cx.notify();
        })
        .child(super.render());
    const t = theme();
    return this.panel
      ? this.panel.render(t)
      : div().size_full().p(18).bg(themeColor(t, "popover")).child("Nothing to show here.");
  }
}
