import { describe, expect, test } from "bun:test";
import { fromHsva, parseColor, toHsva } from "./overlayColor";

// The colors a group's banner overlay takes (the user, 2026-11-18: a backing behind the controls
// and a color for the controls, each typed in a text box or picked, the backing able to be
// transparent).

describe("reading a color typed for a banner overlay", () => {
  test("a six-digit hex color is kept in lowercase", () => {
    expect(parseColor("#FF8800")).toBe("#ff8800");
  });

  test("a three-digit hex color is written out in six digits", () => {
    expect(parseColor("#f80")).toBe("#ff8800");
  });

  test("an eight-digit hex color keeps its see-through amount", () => {
    expect(parseColor("#ff880080")).toBe("#ff880080");
  });

  test("a fully opaque eight-digit hex color is written in six digits", () => {
    expect(parseColor("#ff8800ff")).toBe("#ff8800");
  });

  test("a color name is read as its hex color", () => {
    expect(parseColor("rebeccapurple")).toBe("#663399");
  });

  test("text around a color is ignored", () => {
    expect(parseColor("  #ff8800 ")).toBe("#ff8800");
  });

  test("text that names no color is not a color", () => {
    expect(parseColor("not a color")).toBeNull();
  });
});

describe("a color as the picker holds it", () => {
  test("a color's hue, saturation, brightness, and opacity come from its hex form", () => {
    expect(toHsva("#ff000080")).toEqual({ h: 0, s: 100, v: 100, a: 0.5 });
  });

  test("a hue, saturation, brightness, and opacity give back the hex form", () => {
    expect(fromHsva({ h: 120, s: 100, v: 100, a: 0 })).toBe("#00ff0000");
  });
});
