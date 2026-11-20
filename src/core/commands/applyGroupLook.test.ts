import { expect, test } from "bun:test";
import { emptyGroups } from "../groups/groupModel";
import { defaultSettings } from "../settings/sidebarSettings";
import { applyCommand, type SpacesState } from "./applyCommand";

// The commands group settings send for the per-panel looks (spec:
// docs/specs/finalized/nerd-herd-agents.html#spec-question-group-look-per-panel@jj:14ab73a0,
// "set in the group's settings under Spaces: one Show as choice for Spaces and one for Agents").
const start: SpacesState = { groups: emptyGroups, settings: defaultSettings };
const run = (...commands: string[]) =>
  commands.reduce((s, c) => applyCommand(s, c, () => "g1"), start);

test("group-set saves the group's Show as choice for Spaces and for Agents", () => {
  const s = run(
    'group-make:{"name":"townsquare"}',
    'group-set:{"group":"townsquare","spacesLook":"folder","agentsLook":"banner"}',
  );
  const g = s.groups.groups[0];
  expect([g?.spacesLook, g?.agentsLook], "folder for Spaces, banner for Agents").toEqual([
    "folder",
    "banner",
  ]);
});

// Spec: docs/specs/finalized/nerd-herd-agents.html#test-case-the-second-banner-style-has-its-own-images@jj:14ab73a0
test("group-banner saves the second banner style's open and folded links", () => {
  const s = run(
    'group-make:{"name":"frankenstein"}',
    'group-banner:{"group":"frankenstein","secondOpen":"https://b.example/q-open.png","secondFolded":"https://b.example/q-folded.png"}',
  );
  const g = s.groups.groups[0];
  expect([g?.secondOpenBanner, g?.secondFoldedBanner], "the second style's two links").toEqual([
    "https://b.example/q-open.png",
    "https://b.example/q-folded.png",
  ]);
});
