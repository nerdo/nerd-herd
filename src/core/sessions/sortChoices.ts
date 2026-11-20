// The Agents sort menu's choices: Herdr's two, then nerd-herd's Grouped by group.
import type { GroupWord } from "../settings/sidebarSettings";

export type SortId = "priority" | "grouped" | "groups";

export interface SortChoice {
  readonly id: SortId;
  readonly label: string;
}

export const sortChoices = (word: GroupWord): SortChoice[] => [
  { id: "priority", label: "Priority" },
  { id: "grouped", label: "Grouped by space" },
  { id: "groups", label: `Grouped by ${word.singular.toLowerCase()}` },
];
