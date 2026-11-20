// The nerd-herd Agents mod: Herdr's sidebar Agents section, drawn from the rows the session list
// arranges. Commands sent to the mod (`rename:{...}`, `focus:{...}`) reach Herdr through the app.
import { h_flex, v_flex } from "gpui-base";
import { type AsyncContext, div, svg, View } from "gpui-kit";
import { nextCommand, props, theme } from "herdr";
import { AgentsListError, rowsOrError } from "../../core/sessions/rowsOrError";
import { type AgentsRow, folderKey, pinnedKey } from "../../core/sessions/sessionList";
import { errorCard } from "../errorCard";
import { themeColor } from "../themeColor";
import { agentsApp } from "./app";
import { cardView, statusPill } from "./cardView";
import { agentsGroupHeader } from "./groupHeader";
import { openSortMenu, sortMenu } from "./sortMenu";

type Theme = Record<string, string>;

/** The JSON in a command, or null when it cannot be read: the command is skipped, the loop goes on. */
const readJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

/** The string field `key` of the JSON after "<action>:" in a command, or null. */
const field = (command: string, action: string, key: string): string | null => {
  if (!command.startsWith(`${action}:`)) return null;
  const parsed = readJson(command.slice(action.length + 1));
  if (typeof parsed !== "object" || parsed === null) return null;
  const value: unknown = Object.getOwnPropertyDescriptor(parsed, key)?.value;
  return typeof value === "string" ? value : null;
};

/** The card under the pointer, which shows its pin button. */
let hoveredCard: string | null = null;

const rowView = (t: Theme, row: AgentsRow) => {
  switch (row.kind) {
    case "section":
      if (row.pinned === true && row.count !== undefined)
        return statusPill(t, "pinned", row.label, row.count, pinnedKey, () =>
          agentsApp.foldStatus(pinnedKey),
        );
      return row.status === undefined || row.count === undefined
        ? div().pt(6).text_color(themeColor(t, "muted")).child(row.label)
        : statusPill(t, row.status, row.label, row.count, row.status, () =>
            agentsApp.foldStatus(row.status ?? ""),
          );
    case "group":
      return agentsGroupHeader(t, row, agentsApp.groupHeader(row.id, row.folded === true), () =>
        agentsApp.fold(row.id),
      );
    case "ungrouped":
      return div().pt(8).font_semibold().text_color(themeColor(t, "foreground")).child(row.label);
    case "folder":
      return statusPill(t, row.status, row.label, row.count, folderKey(row.group, row.status), () =>
        agentsApp.foldStatus(folderKey(row.group, row.status)),
      );
    case "card":
      return cardView(
        t,
        row,
        agentsApp.since(row.terminal),
        agentsApp.vcs(row.terminal),
        () => agentsApp.focus(row.terminal),
        () => agentsApp.promptRename(row.terminal),
        {
          hovered: hoveredCard === row.terminal,
          hover: (on) => {
            if (on) hoveredCard = row.terminal;
            else if (hoveredCard === row.terminal) hoveredCard = null;
          },
          toggle: () => agentsApp.pin(row.terminal),
        },
      );
  }
};

/** One of this copy's props (from the layout, or the overlay that opened it). */
const prop = (key: string): unknown => {
  const given: unknown = props();
  return typeof given === "object" && given !== null
    ? Object.getOwnPropertyDescriptor(given, key)?.value
    : undefined;
};
const isSortMenu = (): boolean => prop("sortMenu") === true;

/** The rows, or in their place a card with the error's reference. A group's header draws its own
 *  margins (a banner spans the full width, as in Spaces); every other row sits inside the side gap. */
const rowsView = (t: Theme, rows: AgentsRow[] | AgentsListError) =>
  rows instanceof AgentsListError
    ? [errorCard(t, rows.message)]
    : rows.map((row, i) =>
        row.kind === "group"
          ? // An open group ends with room below its last card; folded headers stay flush.
            div()
              .when(rows[i - 1]?.kind === "card", (el) => el.pt(14))
              .child(rowView(t, row))
          : div().px(12).child(rowView(t, row)),
      );

export default class AgentsMod extends View {
  init(_props: unknown, cx: AsyncContext): void {
    // The sort menu is a second copy of this mod in a popup; only the sidebar's copy takes commands.
    if (isSortMenu()) return;
    agentsApp.recordStartingPoints();
    // Every 2 s: record new sessions' starting points, and redraw so each card's time moves on.
    cx.timer.every(2000, (cx) => {
      agentsApp.recordStartingPoints();
      cx.notify();
    });
    // Version control labels: read now, then every 10 s, in the background (never while drawing).
    const readVcs = () =>
      cx.spawn(async (cx) => {
        if (await agentsApp.refreshVcs()) cx.notify();
      });
    readVcs();
    cx.timer.every(10_000, () => readVcs());
    cx.spawn(async (cx) => {
      for (;;) {
        const command = await nextCommand();
        const renamed = field(command, "rename", "terminal");
        const name = field(command, "rename", "name");
        const focused = field(command, "focus", "terminal");
        const pinned = field(command, "pin", "terminal");
        const sort = field(command, "sort", "id");
        const fold = field(command, "fold", "group");
        const foldStatus = field(command, "fold-status", "key");
        if (foldStatus !== null) agentsApp.foldStatus(foldStatus);
        if (fold !== null) agentsApp.fold(fold);
        if (command === "open-sort") openSortMenu();
        if (command === "dismiss") await agentsApp.dismiss();
        if (sort !== null) agentsApp.sort(sort);
        if (renamed !== null && name !== null) agentsApp.rename(renamed, name);
        if (focused !== null) agentsApp.focus(focused);
        if (pinned !== null) agentsApp.pin(pinned);
        cx.notify();
      }
    });
  }

  render() {
    const t = theme();
    const given = props();
    if (
      typeof given === "object" &&
      given !== null &&
      Object.getOwnPropertyDescriptor(given, "sortMenu")?.value === true
    ) {
      const overlay: unknown = Object.getOwnPropertyDescriptor(given, "overlay")?.value;
      return sortMenu(
        t,
        agentsApp.sortChoices(),
        agentsApp.currentSort(),
        agentsApp.sort,
        typeof overlay === "string" ? overlay : null,
      );
    }
    return v_flex()
      .size_full()
      .child(
        h_flex()
          .px(12)
          .pb(4)
          .justify_between()
          .items_center()
          .child(div().text_color(themeColor(t, "foreground")).child("Agents"))
          .child(
            div()
              .id("agents-sort")
              .cursor_pointer()
              .text_color(themeColor(t, "muted"))
              .on_click(() => openSortMenu())
              .child(svg("mods/workspace-chrome/clock.svg").size(14)),
          ),
      )
      .children(rowsView(t, rowsOrError(agentsApp.rows)));
  }
}
