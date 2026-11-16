/** How a list of named items is ordered. Custom keeps the order the items arrive in. */
export type SortChoice = "custom" | "alphabetical" | "reverseAlphabetical";
export type ItemName = string;
export interface Named {
  readonly name: ItemName;
}

const byName = (a: Named, b: Named) =>
  a.name.localeCompare(b.name, undefined, { sensitivity: "base", numeric: true });

/** Returns the items in the chosen order, as a new list; the items' own order is never changed. */
export const sortOrder = <T extends Named>(choice: SortChoice, items: readonly T[]): T[] => {
  if (choice === "alphabetical") return [...items].sort(byName);
  if (choice === "reverseAlphabetical") return [...items].sort((a, b) => byName(b, a));
  return [...items];
};
