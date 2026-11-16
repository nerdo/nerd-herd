import { describe, expect, test } from "bun:test";
import { GroupNameError } from "../groups/groupModel";
import { bannerOffset, groupNameMessage, newGroupLabel } from "./spacesText";

const environment = { singular: "Environment", plural: "Environments" };

describe("Spaces text and layout", () => {
  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-the-new-group-button-uses-the-chosen-word@jj:093e16ca
  // "The new-group button's label reads New environment"
  test("the new-group button uses the chosen word", () => {
    expect(newGroupLabel(environment)).toBe("New environment");
  });

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-a-refused-name-explains-itself-in-the-chosen-group-word@jj:093e16ca
  // "The name field shows Environment names can be at most 60 characters. This one has 61."
  test("a refused name explains itself in the chosen group word", () => {
    expect(groupNameMessage(new GroupNameError("tooLong", 61), environment)).toBe(
      "Environment names can be at most 60 characters. This one has 61.",
    );
  });

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-a-wide-banner-keeps-its-proportions-and-is-clipped@jj:093e16ca
  // "the header shows its leftmost 268 points"
  test("a wide banner clipped on the left starts at its left edge", () => {
    expect(bannerOffset(1200, 268, "left")).toBe(0);
  });

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-a-centered-banner-clips-both-sides-equally@jj:093e16ca
  // "The header shows the banner from 466 to 734 points across"
  test("a centered banner clips both sides equally", () => {
    expect(bannerOffset(1200, 268, "center")).toBe(-466);
  });
});
