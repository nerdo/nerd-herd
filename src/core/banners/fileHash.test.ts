import { describe, expect, test } from "bun:test";
import { fileHash } from "./fileHash";

const bytes = (s: string) => new TextEncoder().encode(s);

describe("a banner file's name hash", () => {
  // FNV-1a 32-bit of "a" is e40c292c (the algorithm's published test vector); the name starts with it.
  test("starts with the FNV-1a hash of the bytes", () => {
    expect(fileHash(bytes("a")).slice(0, 8)).toBe("e40c292c");
  });

  // Statement gained from the production-path probe: the name is 16 hex digits, never signed.
  test("is 16 hex digits", () => {
    expect(fileHash(bytes("WORK BANNER"))).toMatch(/^[0-9a-f]{16}$/);
  });
});
