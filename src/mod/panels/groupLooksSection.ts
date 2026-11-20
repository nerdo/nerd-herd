// The part of a group's settings that sets how the group looks in each panel: the second banner
// style's two links, and the Show as choice for Spaces and for Agents (nerd-herd Agents spec,
// question "Group look per panel").
import { InputState } from "gpui-base";
import type { Element } from "gpui-kit";
import type { SavedGroup } from "../../core/groups/groupModel";
import { choice, field, label, type Theme } from "./formParts";

const spacesChoices = [
  { value: "banner", text: "Banner" },
  { value: "second", text: "Second banner" },
  { value: "folder", text: "Folder" },
] as const;
const agentsChoices = [{ value: "spaces", text: "Same as Spaces" }, ...spacesChoices] as const;

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

  constructor(group: SavedGroup) {
    this.secondOpen = InputState.new({ value: group.secondOpenBanner ?? "" });
    this.secondFolded = InputState.new({ value: group.secondFoldedBanner ?? "" });
    // A group saved before Show as existed shows what Spaces draws for it today.
    const today = (group.openBanner ?? group.foldedBanner) ? "banner" : "folder";
    this.spaces = known(spacesChoices, group.spacesLook) ?? today;
    this.agents = known(agentsChoices, group.agentsLook) ?? "spaces";
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
    ];
  }

  /** What Save sends: the looks for group-set, the second style's links for group-banner. */
  saved(): {
    look: { spacesLook: SpacesShowAs; agentsLook: AgentsShowAs };
    banner: { secondOpen: string | null; secondFolded: string | null };
  } {
    const text = (s: InputState) => s.value().trim() || null;
    return {
      look: { spacesLook: this.spaces, agentsLook: this.agents },
      banner: { secondOpen: text(this.secondOpen), secondFolded: text(this.secondFolded) },
    };
  }
}
