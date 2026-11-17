import { describe, expect, test } from "bun:test";
import type { BannerState } from "../banners/bannerCache";
import type { SpacesRow } from "../groups/groupModel";
import { groupHeaderLook } from "./groupHeaderLook";

type GroupRow = Extract<SpacesRow, { kind: "group" }>;

const work: GroupRow = {
  kind: "group",
  id: "work",
  name: "Work",
  icon: { kind: "emoji", value: "💼" },
  depth: 0,
  folded: false,
  count: 2,
  banner: "https://banners.example/work.png",
  clip: "left",
  chevron: true,
  align: "middle",
};
const loaded: BannerState = {
  kind: "ready",
  file: { path: "mods/nerd-herd-spaces/.banners/work.png", width: 240, height: 60 },
};

describe("a group header's look", () => {
  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-a-loaded-banner-takes-the-place-of-the-group-s-row@jj:261617da
  // "Work's header is the banner, and Work's row with its icon and name is not drawn"
  test("a loaded banner takes the place of the group's row", () => {
    expect(groupHeaderLook(work, loaded).kind).toBe("banner");
  });

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-an-open-group-s-banner-carries-the-cog-the-and-the-chevron@jj:261617da
  // "The banner carries, in order, the cog, the + and the chevron, and no count"
  test("an open group's banner carries the cog, the + and the chevron", () => {
    expect(groupHeaderLook(work, loaded).controls).toEqual(["cog", "plus", "chevron"]);
  });

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-a-folded-group-s-banner-carries-its-machine-count@jj:261617da
  // "The banner carries, in order, the count 2, the cog, the + and the chevron"
  test("a folded group's banner carries its machine count", () => {
    expect(groupHeaderLook({ ...work, folded: true }, loaded).controls).toEqual([
      "count",
      "cog",
      "plus",
      "chevron",
    ]);
  });

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-a-group-set-to-hide-the-chevron-draws-its-banner-without-one@jj:261617da
  // "The banner carries the cog and the +, and no chevron"
  test("a group set to hide the chevron draws its banner without one", () => {
    expect(groupHeaderLook({ ...work, chevron: false }, loaded).controls).toEqual(["cog", "plus"]);
  });

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-a-group-set-to-the-bottom-draws-its-banner-controls-at-the-bottom@jj:261617da
  // "The banner's controls are placed at the bottom"
  test("a group set to the bottom draws its banner controls at the bottom", () => {
    const look = groupHeaderLook({ ...work, align: "bottom" }, loaded);
    expect(look.kind === "banner" ? look.align : "not a banner").toBe("bottom");
  });

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-a-banner-still-loading-shows-the-plain-row@jj:261617da
  // "Work's header is its plain row with its name and no card"
  test("a banner still loading shows the plain row", () => {
    const look = groupHeaderLook(work, { kind: "none" });
    expect(look.kind === "row" ? [look.kind, look.card] : look.kind).toEqual(["row", null]);
  });

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-a-failed-banner-draws-an-error-card@jj:261617da
  // "Clients' header is its plain row with its name, and beneath it a card reading ..."
  test("a failed banner draws the plain row with an error card", () => {
    const message = "The banner link returned 404 Not Found. Check the link in Spaces settings.";
    const look = groupHeaderLook(work, { kind: "failed", message });
    expect(look.kind === "row" ? [look.kind, look.card] : look.kind).toEqual(["row", message]);
  });
});
