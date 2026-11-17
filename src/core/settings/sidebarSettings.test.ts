import { describe, expect, test } from "bun:test";
import { SavedDataError } from "../errors/savedDataError";
import { defaultSettings, readSettings } from "./sidebarSettings";

describe("sidebar settings", () => {
  test("nothing saved reads as the default settings", () => {
    expect(readSettings(undefined).settings).toEqual({
      groupWord: { singular: "Group", plural: "Groups" },
      ungroupedHeader: false,
      ungroupedName: "Ungrouped",
      indentSpaces: true,
    });
  });

  // Statement from the user, 2026-11-17: indent a machine's spaces under its name, as a setting
  // "defaulted to on" that can be turned off.
  test("indentation saved as off reads back as off", () => {
    expect(readSettings({ indentSpaces: false }).settings.indentSpaces).toBe(false);
  });

  test("a saved indent setting that is not true or false reads as the defaults and reports a saved-data problem", () => {
    const read = readSettings({ indentSpaces: "yes" });
    expect([read.settings, read.problem instanceof SavedDataError]).toEqual([defaultSettings, true]);
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
