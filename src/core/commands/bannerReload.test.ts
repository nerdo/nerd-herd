import { describe, expect, test } from "bun:test";
import { emptyGroups } from "../groups/groupModel";
import { defaultSettings } from "../settings/sidebarSettings";
import { applyCommand, CommandError, type SpacesState } from "./applyCommand";
import { bannerReloadLinks } from "./bannerReload";

// The user, 2026-11-17: "Add a reload button". Reload loads each banner link a group uses again.
let next = 0;
const run = (state: SpacesState, ...commands: string[]) =>
  commands.reduce((s, c) => applyCommand(s, c, () => `g${++next}`), state);
const saved = run(
  { groups: emptyGroups, settings: defaultSettings },
  'group-make:{"name":"Work"}',
  'group-make:{"name":"Home"}',
  'group-banner:{"group":"Work","open":"~/open.png","folded":"https://example.com/f.png"}',
  'group-banner:{"group":"Home","open":"~/home.png"}',
).groups;

describe("reloading a group's banners", () => {
  test("banner-reload names the group's open and folded banner links, and no other group's", () => {
    expect(bannerReloadLinks(saved, 'banner-reload:{"group":"Work"}')).toEqual([
      "~/open.png",
      "https://example.com/f.png",
    ]);
  });

  test("banner-reload for a group that does not exist is refused", () => {
    expect(() => bannerReloadLinks(saved, 'banner-reload:{"group":"Nope"}')).toThrow(CommandError);
  });
});
