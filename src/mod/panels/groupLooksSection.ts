// The part of a group's settings that sets how the group looks in each panel: the second banner
// style's two links, and the Show as choice for Spaces and for Agents (nerd-herd Agents spec,
// question "Group look per panel").
import { InputState } from "gpui-base";
import type { AsyncContext, Element } from "gpui-kit";
import { agentsOverlay } from "../../core/groups/groupLook";
import type { HexColor } from "../themeColor";
import { ColorField } from "./colorField";
import type { SavedGroup } from "../../core/groups/groupModel";
import { choice, field, label, type Theme } from "./formParts";

const spacesChoices = [
  { value: "banner", text: "Banner" },
  { value: "second", text: "Second banner" },
  { value: "folder", text: "Folder" },
] as const;
const agentsChoices = [{ value: "spaces", text: "Same as Spaces" }, ...spacesChoices] as const;

const agentsPlaces = [
  { value: "spaces", text: "Same as Spaces" },
  { value: "top", text: "Top" },
  { value: "middle", text: "Middle" },
  { value: "bottom", text: "Bottom" },
] as const;
type AgentsPlace = (typeof agentsPlaces)[number]["value"];

type SpacesShowAs = (typeof spacesChoices)[number]["value"];
type AgentsShowAs = (typeof agentsChoices)[number]["value"];

const known = <V extends string>(
  options: readonly { readonly value: V }[],
  value: string | undefined,
): V | undefined => options.find((o) => o.value === value)?.value;

export class GroupLooksSection {
  private readonly secondOpen: InputState;
  private readonly secondFolded: InputState;
  private spaces: SpacesShowAs;
  private agents: AgentsShowAs;
  private place: AgentsPlace;
  private readonly agentsBacking: ColorField;
  private readonly agentsControls: ColorField;

  constructor(
    private readonly group: SavedGroup,
    cx: AsyncContext,
  ) {
    this.secondOpen = InputState.new({ value: group.secondOpenBanner ?? "" });
    this.secondFolded = InputState.new({ value: group.secondFoldedBanner ?? "" });
    // A group saved before Show as existed shows what Spaces draws for it today.
    const today = (group.openBanner ?? group.foldedBanner) ? "banner" : "folder";
    this.spaces = known(spacesChoices, group.spacesLook) ?? today;
    this.agents = known(agentsChoices, group.agentsLook) ?? "spaces";
    this.place = group.agentsAlign ?? "spaces";
    // Each color field starts at the color Agents draws today: its own, else Spaces'.
    const now = agentsOverlay(group);
    this.agentsBacking = new ColorField(
      "agents-backing",
      now.backingColor,
      { h: 0, s: 0, v: 0, a: 0.5 },
      false,
      cx,
    );
    this.agentsControls = new ColorField(
      "agents-controls",
      now.controlsColor,
      { h: 0, s: 0, v: 100, a: 1 },
      false,
      cx,
    );
  }

  /** A drag in a color picker ends at any release in the dialog. */
  release(): void {
    this.agentsBacking.release();
    this.agentsControls.release();
  }

  /** True while a color field holds text that names no color: nothing is saved until it is fixed. */
  invalid(): boolean {
    return (
      this.agentsBacking.value().kind === "invalid" ||
      this.agentsControls.value().kind === "invalid"
    );
  }

  render(t: Theme): Element[] {
    return [
      label(t, "Second banner link (https or a file path), optional"),
      field(t, this.secondOpen),
      label(t, "Second folded banner link (https or a file path), optional"),
      field(t, this.secondFolded),
      label(t, "Show as in Spaces"),
      choice(t, "spaces-look", spacesChoices, this.spaces, (v) => {
        this.spaces = v;
      }),
      label(t, "Show as in Agents"),
      choice(t, "agents-look", agentsChoices, this.agents, (v) => {
        this.agents = v;
      }),
      label(t, "Strip on the banner in Agents (where the marks of a folded group show)"),
      choice(t, "agents-place", agentsPlaces, this.place, (v) => {
        this.place = v;
      }),
      label(t, "Agents strip backing (starts as Spaces')"),
      ...this.agentsBacking.render(t),
      label(t, "Agents strip controls color (starts as Spaces')"),
      ...this.agentsControls.render(t),
    ];
  }

  /** What Save sends: the looks for group-set, the second style's links for group-banner. */
  saved(): {
    look: {
      spacesLook: SpacesShowAs;
      agentsLook: AgentsShowAs;
      agentsAlign?: "top" | "middle" | "bottom";
      agentsBackingColor?: HexColor | null;
      agentsControlsColor?: HexColor | null;
    };
    banner: { secondOpen: string | null; secondFolded: string | null };
  } {
    const text = (s: InputState) => s.value().trim() || null;
    // An Agents color is saved once it is Agents' own, or once it differs from what Agents draws now.
    const now = agentsOverlay(this.group);
    const color = (field: ColorField, own: HexColor | null | undefined, shown: HexColor | null) => {
      const v = field.shown();
      return own !== undefined || v !== shown ? { value: v } : null;
    };
    const backing = color(this.agentsBacking, this.group.agentsBackingColor, now.backingColor);
    const controls = color(this.agentsControls, this.group.agentsControlsColor, now.controlsColor);
    return {
      look: {
        spacesLook: this.spaces,
        agentsLook: this.agents,
        ...(this.place === "spaces" ? {} : { agentsAlign: this.place }),
        ...(backing ? { agentsBackingColor: backing.value } : {}),
        ...(controls ? { agentsControlsColor: controls.value } : {}),
      },
      banner: { secondOpen: text(this.secondOpen), secondFolded: text(this.secondFolded) },
    };
  }
}
