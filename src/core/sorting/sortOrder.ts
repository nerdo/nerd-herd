/** How a list of named items is ordered. Custom keeps the order the items arrive in. */
export type SortChoice = "custom" | "alphabetical" | "reverseAlphabetical";
export type ItemName = string;
export interface Named {
  readonly name: ItemName;
}

// CROSSING (walking skeleton): real in shape, orders nothing yet.
export const sortOrder = <T extends Named>(_choice: SortChoice, _items: readonly T[]): T[] => [];
