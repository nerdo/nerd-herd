import { describe, expect, test } from "bun:test";
import { createBannerCache } from "./bannerCache";
import { BannerLinkError } from "./fetchBanner";

// Statements from the spec's Banner cache module definition ("What the view can draw for a link
// right now"), pinned: docs/specs/in-progress/executing-nerd-herd-spaces.html#spec-module-banner-cache@jj:093e16ca
const file = { path: "mods/nerd-herd-spaces/.banners/abc.png", width: 240, height: 60 };

describe("banner cache", () => {
  test("a link that has not loaded has no banner yet", () => {
    const cache = createBannerCache(async () => file);
    expect(cache.lookup("https://example.test/work.png")).toEqual({ kind: "none" });
  });

  test("a link that loaded has its banner file ready", async () => {
    const cache = createBannerCache(async () => file);
    await cache.load("https://example.test/work.png");
    expect(cache.lookup("https://example.test/work.png")).toEqual({ kind: "ready", file });
  });

  test("a link that failed to load holds the failure's message", async () => {
    const cache = createBannerCache(async (link) => {
      throw new BannerLinkError(link);
    });
    await cache.load("http://example.test/work.png");
    expect(cache.lookup("http://example.test/work.png")).toEqual({
      kind: "failed",
      message:
        "Banner links must start with https://, or name a file on this computer (/…, ~/…, or file://…). Use the https version of a web link.",
    });
  });
});
