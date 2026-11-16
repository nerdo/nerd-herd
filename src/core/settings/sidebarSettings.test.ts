import { describe, expect, test } from "bun:test";
import { SavedDataError } from "../errors/savedDataError";
import { defaultSettings, readSettings } from "./sidebarSettings";

describe("sidebar settings", () => {
  test("nothing saved reads as the default settings", () => {
    expect(readSettings(undefined).settings).toEqual({
      groupWord: { singular: "Group", plural: "Groups" },
      ungroupedHeader: false,
      ungroupedName: "Ungrouped",
    });
  });

  test("a saved group word is read back, with the other settings at their defaults", () => {
    expect(
      readSettings({ groupWord: { singular: "Environment", plural: "Environments" } }).settings,
    ).toEqual({
      ...defaultSettings,
      groupWord: { singular: "Environment", plural: "Environments" },
    });
  });

  test("saved settings of the wrong shape read as the defaults and report a saved-data problem", () => {
    const read = readSettings({ ungroupedHeader: "yes" });
    expect([
      read.settings,
      read.problem instanceof SavedDataError,
      read.problem?.userAction,
    ]).toEqual([defaultSettings, true, "report"]);
  });
});
