import { expect, test } from "bun:test";
import { emptyGroups, make } from "./groupFixtures";
import { setBanner } from "./groupActions";
import type { SavedGroup } from "./groupModel";
import { agentsOverlay, groupLook } from "./groupLook";

const open = "https://banners.example/open.png";

/** The Work group with an open banner, plus raw saved fields, as a saved file might hold them. */
const work = (extra: Record<string, unknown> = {}): SavedGroup => {
  const saved = setBanner(make(emptyGroups, "work", "Work"), "work", "open", open);
  const group = saved.groups[0];
  if (!group) throw new Error("fixture made no group");
  return { ...group, ...extra };
};

// Spec: docs/specs/finalized/nerd-herd-agents.html#test-case-an-unknown-look-counts-as-the-default@jj:14ab73a0
// "A saved group whose Agents look is 'huge' and whose Spaces look is missing, with a banner:
//  Spaces gets the banner, by today's rule, and Agents gets the same as Spaces."
test("an unknown Agents look and a missing Spaces look both draw the group's banner", () => {
  const group = work({ agentsLook: "huge" });
  expect(
    [groupLook(group, "spaces", false), groupLook(group, "agents", false)],
    "Spaces by today's rule, Agents the same as Spaces",
  ).toEqual([
    { kind: "banner", link: open },
    { kind: "banner", link: open },
  ]);
});

// Spec: docs/specs/finalized/nerd-herd-agents.html#test-case-each-panel-draws-its-own-look@jj:14ab73a0
// "A group with a banner, Show as Folder for Spaces and Banner for Agents: Spaces gets the folder
//  with the group's icon, and Agents gets the banner's open image."
test("a group shown as a folder in Spaces and as its banner in Agents draws each in its panel", () => {
  const group = work({ spacesLook: "folder", agentsLook: "banner" });
  expect(
    [groupLook(group, "spaces", false), groupLook(group, "agents", false)],
    "the folder in Spaces, the open banner in Agents",
  ).toEqual([{ kind: "folder" }, { kind: "banner", link: open }]);
});

// Spec: docs/specs/finalized/nerd-herd-agents.html#test-case-agents-follows-spaces-by-default@jj:14ab73a0
// "A group saved before this spec, with a banner: Agents gets the banner's open image, the same
//  as Spaces."
test("a group saved before Show as existed draws its open banner in Agents, as in Spaces", () => {
  expect(groupLook(work(), "agents", false), "the open banner").toEqual({
    kind: "banner",
    link: open,
  });
});

const secondOpen = "https://banners.example/quiet-open.png";
const secondFolded = "https://banners.example/quiet-folded.png";

// Spec: docs/specs/finalized/nerd-herd-agents.html#test-case-the-second-banner-style-has-its-own-images@jj:14ab73a0
// "A group whose second banner style has an open and a folded image, Show as Second banner for
//  Spaces: Spaces gets the second style's open image, then its folded image."
test("shown as its second banner in Spaces, a group draws that style's open image, then its folded one", () => {
  const group = work({
    spacesLook: "second",
    secondOpenBanner: secondOpen,
    secondFoldedBanner: secondFolded,
  });
  expect(
    [groupLook(group, "spaces", false), groupLook(group, "spaces", true)],
    "the second style's open image open, its folded image folded",
  ).toEqual([
    { kind: "banner", link: secondOpen },
    { kind: "banner", link: secondFolded },
  ]);
});

// Spec: docs/specs/finalized/nerd-herd-agents.html#test-case-a-banner-choice-without-an-image-shows-the-folder@jj:14ab73a0
// "A group with no second banner style, Show as Second banner for Agents: Agents gets the folder
//  with the group's icon."
test("shown as a second banner it does not have, a group draws its folder in Agents", () => {
  expect(groupLook(work({ agentsLook: "second" }), "agents", false), "the folder").toEqual({
    kind: "folder",
  });
});

// Spec: docs/specs/finalized/nerd-herd-agents.html#test-case-agents-uses-its-own-fold-for-the-folded-image@jj:14ab73a0
// "A banner group open in Spaces and folded in Agents, its banner style having a folded image:
//  Agents gets the folded image, and Spaces gets the open image."
test("a banner group folded in Agents and open in Spaces draws the folded image in Agents only", () => {
  const folded = "https://banners.example/folded.png";
  const group = work({ foldedBanner: folded });
  expect(
    [groupLook(group, "agents", true), groupLook(group, "spaces", false)],
    "the folded image in Agents, the open image in Spaces",
  ).toEqual([
    { kind: "banner", link: folded },
    { kind: "banner", link: open },
  ]);
});

// Spec: docs/specs/in-progress/executing-nerd-herd-agents.html#test-case-the-agents-overlay-follows-spaces-until-set@jj:607ab1aa
// "A group with Spaces' strip at the bottom and a red backing, and no Agents overlay settings: it is
//  at the bottom with the red backing; once the Agents strip is set to top, Agents reads top while
//  Spaces stays bottom."
test("Agents' banner overlay follows Spaces' until set, then keeps its own place", () => {
  const spaces = work({ align: "bottom", backingColor: "#ff000080" });
  const own: SavedGroup = { ...spaces, agentsAlign: "top" };
  expect(
    [agentsOverlay(spaces), agentsOverlay(own), own.align],
    "bottom and red, then top and red, with Spaces still bottom",
  ).toEqual([
    { align: "bottom", backingColor: "#ff000080", controlsColor: null },
    { align: "top", backingColor: "#ff000080", controlsColor: null },
    "bottom",
  ]);
});
