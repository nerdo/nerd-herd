import { describe, expect, test } from "bun:test";
import { sortOrder } from "./sortOrder";

const named = (...names: string[]) => names.map((name) => ({ name }));
const names = (items: readonly { name: string }[]) => items.map((i) => i.name);

describe("sort order", () => {
  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-alphabetical-sort-orders-machines-by-name@jj:093e16ca
  test("alphabetical sort orders machines by name", () => {
    expect(names(sortOrder("alphabetical", named("desk-home", "ai-sandbox")))).toEqual([
      "ai-sandbox",
      "desk-home",
    ]);
  });

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-reverse-alphabetical-sort-orders-machines-by-name-last-first@jj:093e16ca
  test("reverse alphabetical sort orders machines by name, last first", () => {
    expect(
      names(sortOrder("reverseAlphabetical", named("ai-sandbox", "desk-home"))),
    ).toEqual(["desk-home", "ai-sandbox"]);
  });

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-returning-to-custom-sort-restores-the-dragged-order@jj:093e16ca
  test("returning to custom sort restores the dragged order", () => {
    expect(names(sortOrder("custom", named("desk-home", "ai-sandbox")))).toEqual([
      "desk-home",
      "ai-sandbox",
    ]);
  });

  test("sorting alphabetically leaves the custom order unchanged", () => {
    const custom = named("desk-home", "ai-sandbox");
    sortOrder("alphabetical", custom);
    expect(names(custom)).toEqual(["desk-home", "ai-sandbox"]);
  });
});
