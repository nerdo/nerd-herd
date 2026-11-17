// A group's settings, opened from its cog or its menu: icon, banner links, clip side, sorts, folded
// count, and how its banner carries the controls (chevron shown, controls' place).
import { InputState } from "gpui-base";
import type { AsyncContext } from "gpui-kit";
import type { ClipSide, ControlAlign, CountMode, SavedGroup } from "../../core/groups/groupModel";
import type { SortChoice } from "../../core/sorting/sortOrder";
import {
  choice,
  close,
  dialog,
  field,
  label,
  type Panel,
  send,
  type Theme,
  title,
  type DialogScroll,
} from "./formParts";

const sorts = [
  { value: "custom", text: "Custom" },
  { value: "alphabetical", text: "A to Z" },
  { value: "reverseAlphabetical", text: "Z to A" },
] as const;

export class GroupSettingsPanel implements Panel {
  private readonly icon: InputState;
  private readonly openLink: InputState;
  private readonly foldedLink: InputState;
  private clip: ClipSide;
  private subgroups: SortChoice;
  private machines: SortChoice;
  private count: CountMode;
  private chevron: "shown" | "hidden";
  private align: ControlAlign;

  constructor(
    private readonly group: SavedGroup,
    private readonly word: string,
    _cx: AsyncContext,
  ) {
    this.icon = InputState.new({ value: group.icon?.value ?? "" });
    this.openLink = InputState.new({ value: group.openBanner ?? "" });
    this.foldedLink = InputState.new({ value: group.foldedBanner ?? "" });
    this.clip = group.clip;
    this.subgroups = group.subgroupSort;
    this.machines = group.machineSort;
    this.count = group.countMode;
    this.chevron = group.chevron ? "shown" : "hidden";
    this.align = group.align;
  }

  private save(): void {
    const id = this.group.id;
    const text = (s: InputState) => s.value().trim();
    send("group-set", {
      group: id,
      icon: text(this.icon) || null,
      clip: this.clip,
      countMode: this.count,
      chevron: this.chevron === "shown",
      align: this.align,
    });
    send("group-banner", {
      group: id,
      open: text(this.openLink) || null,
      folded: text(this.foldedLink) || null,
    });
    send("sort-set", { group: id, subgroups: this.subgroups, machines: this.machines });
    close();
  }

  render(t: Theme, scroll: DialogScroll) {
    const w = this.word.toLowerCase();
    return dialog(
      t,
      scroll,
      [
        title(t, `${this.group.name} settings`),
        label(t, "Icon (an emoji)"),
        field(t, this.icon),
        label(t, "Banner link (https), or the open banner when a folded one is set"),
        field(t, this.openLink),
        label(t, "Folded banner link (https), optional"),
        field(t, this.foldedLink),
        label(t, "When the banner is wider than the sidebar, keep"),
        choice(
          t,
          "clip",
          [
            { value: "left", text: "Left edge" },
            { value: "center", text: "Center" },
          ] as const,
          this.clip,
          (v) => {
            this.clip = v;
          },
        ),
        label(t, `Sort ${w}s inside`),
        choice(t, "subgroups", sorts, this.subgroups, (v) => {
          this.subgroups = v;
        }),
        label(t, "Sort machines inside"),
        choice(t, "machines", sorts, this.machines, (v) => {
          this.machines = v;
        }),
        label(t, "Count shown when folded"),
        choice(
          t,
          "count",
          [
            { value: "allMachines", text: "Every machine inside" },
            { value: "directMachines", text: "Direct machines" },
            { value: "directItems", text: "Direct items" },
          ] as const,
          this.count,
          (v) => {
            this.count = v;
          },
        ),
        label(t, "Fold chevron on the banner"),
        choice(
          t,
          "chevron",
          [
            { value: "shown", text: "Shown" },
            { value: "hidden", text: "Hidden" },
          ] as const,
          this.chevron,
          (v) => {
            this.chevron = v;
          },
        ),
        label(t, "Controls on the banner"),
        choice(
          t,
          "align",
          [
            { value: "top", text: "Top" },
            { value: "middle", text: "Middle" },
            { value: "bottom", text: "Bottom" },
          ] as const,
          this.align,
          (v) => {
            this.align = v;
          },
        ),
      ],
      "Save",
      () => this.save(),
    );
  }
}
