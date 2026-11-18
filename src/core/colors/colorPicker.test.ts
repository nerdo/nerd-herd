import { describe, expect, test } from "bun:test";
import { barPick, fieldColor, squarePick } from "./colorPicker";

// The overlay color picker (the user, 2026-11-18: "a button to reset it to the default, along with
// a color picker (not just a text box for color entry)"; asked which picker: "full picker").

describe("picking in the color square", () => {
  test("the square's left edge is no saturation and its right edge is full saturation", () => {
    const size = { width: 200, height: 100 };
    expect([squarePick({ x: 0, y: 0 }, size).s, squarePick({ x: 200, y: 0 }, size).s]).toEqual([
      0, 100,
    ]);
  });

  test("the square's top is full brightness and its bottom is none", () => {
    const size = { width: 200, height: 100 };
    expect([squarePick({ x: 0, y: 0 }, size).v, squarePick({ x: 0, y: 100 }, size).v]).toEqual([
      100, 0,
    ]);
  });

  test("a point dragged past the square's edge picks the edge", () => {
    expect(squarePick({ x: -30, y: 250 }, { width: 200, height: 100 })).toEqual({ s: 0, v: 0 });
  });
});

describe("picking on a bar", () => {
  test("a bar's left end is its lowest value and its right end its highest", () => {
    expect([barPick(0, 200, 0, 360), barPick(200, 200, 0, 360)]).toEqual([0, 360]);
  });

  test("a point halfway along a bar picks the middle value", () => {
    expect(barPick(100, 200, 0, 100)).toBe(50);
  });

  test("a point dragged past a bar's end picks that end", () => {
    expect([barPick(-40, 200, 0, 100), barPick(260, 200, 0, 100)]).toEqual([0, 100]);
  });
});

describe("what a color field holds", () => {
  test("an empty color field holds the default", () => {
    expect(fieldColor("  ")).toEqual({ kind: "default" });
  });

  test("a color field holding a color holds its hex form", () => {
    expect(fieldColor("Navy")).toEqual({ kind: "color", color: "#000080" });
  });

  test("a color field holding text that names no color holds no color", () => {
    expect(fieldColor("nope")).toEqual({ kind: "invalid", text: "nope" });
  });
});
