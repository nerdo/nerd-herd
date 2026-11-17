// Spaces settings, opened from the cog beside the Spaces "+": the word for groups (singular and
// plural), the top level's order (groups first or custom), whether a machine's spaces are indented under it, and the ungrouped header (shown or
// not, and its name).
import { InputState } from "gpui-base";
import type { AsyncContext } from "gpui-kit";
import type { LevelOrder } from "../../core/groups/levelOrder";
import type { SidebarSettings } from "../../core/settings/sidebarSettings";
import {
  choice,
  close,
  type DialogScroll,
  dialog,
  field,
  hint,
  label,
  type Panel,
  send,
  type Theme,
  title,
} from "./formParts";
import { levelOrders } from "./groupSettingsPanel";

export class SpacesSettingsPanel implements Panel {
  private readonly singular: InputState;
  private readonly plural: InputState;
  private readonly ungroupedName: InputState;
  private header: "shown" | "hidden";
  private indent: "indented" | "flush";
  private order: LevelOrder;
  private refused: string | null = null;

  constructor(settings: SidebarSettings, order: LevelOrder, _cx: AsyncContext) {
    this.order = order;
    this.singular = InputState.new({ value: settings.groupWord.singular });
    this.plural = InputState.new({ value: settings.groupWord.plural });
    this.ungroupedName = InputState.new({ value: settings.ungroupedName });
    this.header = settings.ungroupedHeader ? "shown" : "hidden";
    this.indent = settings.indentSpaces ? "indented" : "flush";
  }

  private save(): void {
    const singular = this.singular.value().trim();
    const plural = this.plural.value().trim();
    const name = this.ungroupedName.value().trim();
    if (!singular || !plural || !name) {
      this.refused = "Enter both forms of the word, and a name for the ungrouped header.";
      return;
    }
    send("settings-word", { singular, plural });
    send("settings-indent", { indent: this.indent === "indented" });
    send("level-order", { group: null, order: this.order });
    send("settings-ungrouped", { header: this.header === "shown", name });
    close();
  }

  render(t: Theme, scroll: DialogScroll) {
    return dialog(
      t,
      scroll,
      [
        title(t, "Spaces settings"),
        label(t, "Word for a group (one)"),
        field(t, this.singular),
        label(t, "Word for groups (more than one)"),
        field(t, this.plural),
        label(t, "Order at the top level"),
        choice(t, "top-order", levelOrders, this.order, (v) => {
          this.order = v;
        }),
        label(t, "Spaces under a machine"),
        choice(
          t,
          "indent-spaces",
          [
            { value: "indented", text: "Indented" },
            { value: "flush", text: "Flush" },
          ] as const,
          this.indent,
          (v) => {
            this.indent = v;
          },
        ),
        label(t, "Header above the ungrouped machines"),
        choice(
          t,
          "ungrouped-header",
          [
            { value: "hidden", text: "None" },
            { value: "shown", text: "Shown" },
          ] as const,
          this.header,
          (v) => {
            this.header = v;
          },
        ),
        label(t, "Ungrouped header name"),
        field(t, this.ungroupedName),
        ...(this.refused ? [hint(t, this.refused, true)] : []),
      ],
      "Save",
      () => this.save(),
    );
  }
}
