import type { SidebarSettings } from "../settings/sidebarSettings";
import type { GroupId, SavedGroups } from "../store/savedGroupStore";

/** A machine Herdr lists. A null name is this computer. */
export type MachineName = string | null;
export interface Machine {
  readonly name: MachineName;
}

/** One row the Spaces section draws, top to bottom. */
export type SpacesRow =
  | { readonly kind: "group"; readonly id: GroupId; readonly depth: number }
  | { readonly kind: "machine"; readonly name: MachineName; readonly depth: number };

// CROSSING (walking skeleton): real in shape, computes no rows yet.
export const computeRows = (
  _saved: SavedGroups,
  _machines: readonly Machine[],
  _settings: SidebarSettings,
): SpacesRow[] => [];
