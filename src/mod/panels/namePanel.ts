// The dialog that names something: a new group (optionally inside another), a group being renamed,
// or the ungrouped header being renamed. A refused name is explained in the user's word for groups.
import { InputState } from "gpui-base";
import type { AsyncContext } from "gpui-kit";
import { checkedName } from "../../core/groups/groupActions";
import { type GroupId, GroupNameError } from "../../core/groups/groupModel";
import { groupNameMessage, newGroupLabel } from "../../core/presentation/spacesText";
import type { GroupWord } from "../../core/settings/sidebarSettings";
import {
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

export type NameTarget =
  | { readonly kind: "new"; readonly parent: GroupId | null }
  | { readonly kind: "group"; readonly group: GroupId; readonly name: string }
  | { readonly kind: "ungrouped"; readonly name: string };

export class NamePanel implements Panel {
  private readonly input: InputState;
  private refused: string | null = null;

  constructor(
    private readonly target: NameTarget,
    private readonly word: GroupWord,
    cx: AsyncContext,
  ) {
    const value = target.kind === "new" ? "" : target.name;
    this.input = InputState.new({ value });
    if (value) this.input.set_selected_range({ start: 0, end: value.length });
    this.input.on("change", (_e, cx) => {
      this.refused = null;
      cx.notify();
    });
    this.input.on("submit", (_e, cx) => {
      this.save();
      cx.notify();
    });
    this.input.focus();
    cx.timer.after(600, () => this.input.focus());
  }

  private save(): void {
    let name: string;
    try {
      name = checkedName(this.input.value());
    } catch (error) {
      if (!(error instanceof GroupNameError)) throw error;
      this.refused = groupNameMessage(error, this.word);
      return;
    }
    const t = this.target;
    if (t.kind === "new") send("group-make", { name, parent: t.parent });
    else if (t.kind === "group") send("group-rename", { group: t.group, name });
    else send("settings-ungrouped", { name });
    close();
  }

  render(t: Theme, scroll: DialogScroll) {
    const word = this.word.singular.toLowerCase();
    const heading =
      this.target.kind === "new"
        ? newGroupLabel(this.word)
        : this.target.kind === "group"
          ? `Rename ${word}`
          : "Rename the ungrouped header";
    return dialog(
      t,
      scroll,
      [
        title(t, heading),
        label(t, "Name"),
        field(t, this.input),
        ...(this.refused ? [hint(t, this.refused, true)] : []),
      ],
      this.target.kind === "new" ? "Create" : "Save",
      () => this.save(),
    );
  }
}
