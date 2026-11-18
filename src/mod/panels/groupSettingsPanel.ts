// A group's settings, opened from its cog or its menu: icon, banner links, clip side, sorts, folded
// count, and how its banner carries the controls (chevron shown, controls' place, overlay colors).
import { h_flex, InputState } from "gpui-base";
import type { AsyncContext } from "gpui-kit";
import type { ClipSide, ControlAlign, CountMode, SavedGroup } from "../../core/groups/groupModel";
import type { LevelOrder } from "../../core/groups/levelOrder";
import { overlayPreview } from "../bannerOverlay";
import { themeColor } from "../themeColor";
import { ColorField } from "./colorField";
import type { SortChoice } from "../../core/sorting/sortOrder";
import {
  button,
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

/** A level's order: groups above machines, or one custom order (the user, 2026-11-17). */
export const levelOrders = [
  { value: "groupsFirst", text: "Groups first" },
  { value: "custom", text: "Custom" },
] as const;

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
  private order: LevelOrder;
  private readonly backing: ColorField;
  private readonly controlsColor: ColorField;

  constructor(
    private readonly group: SavedGroup,
    private readonly word: string,
    order: LevelOrder,
    cx: AsyncContext,
  ) {
    this.order = order;
    this.icon = InputState.new({ value: group.icon?.value ?? "" });
    this.openLink = InputState.new({ value: group.openBanner ?? "" });
    this.foldedLink = InputState.new({ value: group.foldedBanner ?? "" });
    this.clip = group.clip;
    this.subgroups = group.subgroupSort;
    this.machines = group.machineSort;
    this.count = group.countMode;
    this.chevron = group.chevron ? "shown" : "hidden";
    this.align = group.align;
    // The picker starts at half-see-through black for a backing and at white for the controls.
    this.backing = new ColorField("backing", group.backingColor, { h: 0, s: 0, v: 0, a: 0.5 }, cx);
    this.controlsColor = new ColorField(
      "controls-color",
      group.controlsColor,
      { h: 0, s: 0, v: 100, a: 1 },
      cx,
    );
  }

  /**
   * The overlay section, always shown (the user, 2026-11-18: "keep it open always and just make that
   * be a section"): the preview over the banner, then a field for each color.
   */
  private overlay(t: Theme) {
    const file = this.group.openBannerFile ?? this.group.foldedBannerFile ?? null;
    const colors = {
      backingColor: this.backing.shown(),
      controlsColor: this.controlsColor.shown(),
    };
    return [
      label(t, "Overlay on the banner"),
      file
        ? overlayPreview(
            file,
            384,
            { align: this.align, clip: this.clip, dim: themeColor(t, "dim") },
            colors,
          )
        : hint(t, "The preview shows here once the group's banner has loaded."),
      label(
        t,
        "Backing behind the controls (empty: none; lower the opacity bar to see through it)",
      ),
      ...this.backing.render(t),
      label(t, "Controls color (empty: the theme's)"),
      ...this.controlsColor.render(t),
    ];
  }

  /** Keeps the two banner links as typed, then loads both again (the user, 2026-11-17: "Add a reload button"). */
  private reload(): void {
    const text = (s: InputState) => s.value().trim();
    const group = this.group.id;
    send("group-banner", {
      group,
      open: text(this.openLink) || null,
      folded: text(this.foldedLink) || null,
    });
    send("banner-reload", { group });
  }

  private save(): void {
    const id = this.group.id;
    const backing = this.backing.value();
    const controls = this.controlsColor.value();
    // Text that names no color is marked under its box; nothing is saved until it is fixed.
    if (backing.kind === "invalid" || controls.kind === "invalid") return;
    const text = (s: InputState) => s.value().trim();
    send("group-set", {
      group: id,
      icon: text(this.icon) || null,
      clip: this.clip,
      countMode: this.count,
      chevron: this.chevron === "shown",
      align: this.align,
      backingColor: backing.kind === "color" ? backing.color : null,
      controlsColor: controls.kind === "color" ? controls.color : null,
    });
    send("group-banner", {
      group: id,
      open: text(this.openLink) || null,
      folded: text(this.foldedLink) || null,
    });
    send("sort-set", { group: id, subgroups: this.subgroups, machines: this.machines });
    send("level-order", { group: id, order: this.order });
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
        label(t, "Banner link (https or a file path), or the open banner when a folded one is set"),
        field(t, this.openLink),
        label(t, "Folded banner link (https or a file path), optional"),
        field(t, this.foldedLink),
        // The user, 2026-11-17: "make it clear in the settings dialog how images work".
        hint(
          t,
          "Banner images are copied into nerd-herd when you save, so a banner still shows if its file moves or its web page goes away. When the image at a link changes, load it again with the button below.",
        ),
        h_flex()
          .pt(8)
          .child(button(t, "banner-reload", "Reload images", false, () => this.reload())),
        ...this.overlay(t),
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
        label(t, "Order inside"),
        choice(t, "order", levelOrders, this.order, (v) => {
          this.order = v;
        }),
        ...(this.order === "custom"
          ? [hint(t, "In a custom order the sorts below do not apply.")]
          : []),
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
