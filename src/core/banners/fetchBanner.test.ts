import { describe, expect, test } from "bun:test";
import type { NerdHerdError } from "../errors/nerdHerdError";
import {
  BannerError,
  type BannerLink,
  type Downloader,
  type FileStore,
  fetchBanner,
} from "./fetchBanner";

// Spec-driven bulk tests. Spec cases cite their test case; statements the spec\'s Banner cache module
// definition makes without a test case cite that definition. All pinned to the spec\'s revision.

type Answer = { status: number; contentType: string; bytes: Uint8Array } | "unreachable";

/** A downloader that answers from a table and records what it was asked. */
class FakeDownloader implements Downloader {
  readonly asked: BannerLink[] = [];
  constructor(
    private readonly answers: Record<BannerLink, Answer>,
    private readonly files: MemoryFiles,
  ) {}
  async download(link: BannerLink, to: string) {
    this.asked.push(link);
    const answer = this.answers[link];
    if (answer === undefined || answer === "unreachable")
      return { kind: "unreachable" as const, cause: "fake: cannot connect" };
    this.files.saved.set(to, answer.bytes);
    // Answer on a later tick, as a real download does, so two downloads can overlap.
    await new Promise((resolve) => setTimeout(resolve, 0));
    return {
      kind: "answered" as const,
      status: answer.status,
      contentType: answer.contentType,
      size: answer.bytes.length,
    };
  }
}

/** A file store kept in memory. */
class MemoryFiles implements FileStore {
  readonly saved = new Map<string, Uint8Array>();
  async read(path: string) {
    const bytes = this.saved.get(path);
    if (!bytes) throw new Error(`fake: no file ${path}`);
    return bytes;
  }
  async write(path: string, bytes: Uint8Array) {
    this.saved.set(path, bytes);
  }
  async remove(path: string) {
    this.saved.delete(path);
  }
}

const hash = (bytes: Uint8Array) => new Bun.CryptoHasher("sha256").update(bytes).digest("hex");

/** A PNG's signature and header chunk: enough for its pixel size. */
const png = (width: number, height: number, padding = 0) => {
  const b = new Uint8Array(33 + padding);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  new DataView(b.buffer).setUint32(16, width);
  new DataView(b.buffer).setUint32(20, height);
  return b;
};

const setup = (answers: Record<BannerLink, Answer>) => {
  const files = new MemoryFiles();
  const downloader = new FakeDownloader(answers, files);
  return {
    files,
    downloader,
    deps: { downloader, files, hash, folder: "mods/nerd-herd-spaces/.banners" },
  };
};

const rejection = async (p: Promise<unknown>): Promise<NerdHerdError> => {
  let value: unknown;
  try {
    value = await p;
  } catch (error) {
    if (error instanceof BannerError) return error;
    throw error;
  }
  throw new Error(`expected a banner error, got ${JSON.stringify(value)}`);
};

describe("fetching a banner", () => {
  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-an-http-banner-link-is-refused@jj:093e16ca
  // "It throws a banner error with userAction fix and the message Banner links must start with https://. ... and the downloader is never called"
  test("an http banner link is refused without downloading", async () => {
    const { deps, downloader } = setup({});
    const error = await rejection(fetchBanner("http://example.test/work.png", deps));
    expect([error.userAction, error.message, downloader.asked.length]).toEqual([
      "fix",
      "Banner links must start with https://. Use the https version of the link.",
      0,
    ]);
  });

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-a-banner-over-2-mb-is-refused@jj:093e16ca
  // "It throws a banner error with userAction fix, limit 2 MB, and size 3 MB, with the message ..., and writes no file"
  test("a banner over 2 MB is refused and no file is kept", async () => {
    const link = "https://example.test/huge.png";
    const { deps, files } = setup({
      [link]: { status: 200, contentType: "image/png", bytes: png(10, 10, 3 * 1024 * 1024) },
    });
    const error = await rejection(fetchBanner(link, deps));
    expect([error.userAction, error.message, files.saved.size]).toEqual([
      "fix",
      "The banner image is 3 MB; banners can be at most 2 MB. Use a smaller image.",
      0,
    ]);
  });

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-a-banner-link-answering-404-reports-not-found@jj:093e16ca
  // "It throws a banner error with userAction fix, status 404, and the message The banner link returned 404 Not Found. ..."
  test("a banner link answering 404 reports Not Found", async () => {
    const link = "https://example.test/missing.png";
    const { deps } = setup({
      [link]: { status: 404, contentType: "text/html", bytes: new Uint8Array([60]) },
    });
    const error = await rejection(fetchBanner(link, deps));
    expect([error.userAction, error.message]).toEqual([
      "fix",
      "The banner link returned 404 Not Found. Check the link in Spaces settings.",
    ]);
  });

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#spec-module-banner-cache@jj:093e16ca
  // "an HTTP 5xx answer is retry and its message carries the error's reference id"
  test("a banner link answering 503 asks to try again with a reference", async () => {
    const link = "https://example.test/busy.png";
    const { deps } = setup({
      [link]: { status: 503, contentType: "text/html", bytes: new Uint8Array([60]) },
    });
    const error = await rejection(fetchBanner(link, deps));
    expect([error.userAction, error.message]).toEqual([
      "retry",
      `The banner link returned 503 Service Unavailable. Try again in a moment (reference ${error.metadata.errorId}).`,
    ]);
  });

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-a-banner-link-to-a-web-page-reports-that-it-is-not-an-image@jj:093e16ca
  // "It throws a banner error with userAction fix, content type text/html, and the message The banner link opened a web page, not an image. ..."
  test("a banner link to a web page reports that it is not an image", async () => {
    const link = "https://example.test/page";
    const { deps } = setup({
      [link]: { status: 200, contentType: "text/html; charset=utf-8", bytes: new Uint8Array([60]) },
    });
    const error = await rejection(fetchBanner(link, deps));
    expect([error.userAction, error.message]).toEqual([
      "fix",
      "The banner link opened a web page, not an image. Use a link that ends at the image itself.",
    ]);
  });

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#spec-module-banner-cache@jj:093e16ca
  // "a non-image is fix (correct the link)"
  test("a banner link to something other than a web page or an image reports that it is not an image", async () => {
    const link = "https://example.test/data.json";
    const { deps } = setup({
      [link]: { status: 200, contentType: "application/json", bytes: new Uint8Array([123]) },
    });
    const error = await rejection(fetchBanner(link, deps));
    expect([error.userAction, error.message]).toEqual([
      "fix",
      "The banner link did not open an image. Use a link that ends at the image itself.",
    ]);
  });

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-a-banner-link-to-an-unreachable-host-asks-to-try-again@jj:093e16ca
  // "It throws a banner error with userAction retry, host example.test, the downloader's failure as its cause, and the message ..."
  test("a banner link to an unreachable host asks to try again", async () => {
    const { deps } = setup({ "https://example.test/work.png": "unreachable" });
    const error = await rejection(fetchBanner("https://example.test/work.png", deps));
    expect([error.userAction, error.cause, error.message]).toEqual([
      "retry",
      "fake: cannot connect",
      `Couldn't reach example.test to load the banner. Try again in a moment (reference ${error.metadata.errorId}).`,
    ]);
  });

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-a-banner-link-becomes-a-file-herdr-can-show@jj:093e16ca
  // "It returns a path inside Herdr's app folder, and the file at that path holds the same bytes"
  test("a banner link becomes a file holding the downloaded bytes", async () => {
    const link = "https://example.test/work.png";
    const bytes = png(240, 60, 17);
    const { deps, files } = setup({ [link]: { status: 200, contentType: "image/png", bytes } });
    const banner = await fetchBanner(link, deps);
    expect([banner.path, files.saved.get(banner.path)]).toEqual([
      `mods/nerd-herd-spaces/.banners/${hash(bytes)}.png`,
      bytes,
    ]);
  });

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#test-case-a-downloaded-banner-reports-its-pixel-size@jj:093e16ca
  // "The banner file it returns has width 1200 and height 300"
  test("a downloaded PNG banner reports its pixel size", async () => {
    const link = "https://example.test/wide.png";
    const { deps } = setup({
      [link]: { status: 200, contentType: "image/png", bytes: png(1200, 300) },
    });
    const banner = await fetchBanner(link, deps);
    expect([banner.width, banner.height]).toEqual([1200, 300]);
  });

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#spec-module-banner-cache@jj:093e16ca
  // "Output BannerFile: ... the image's width and height in pixels" (a JPEG banner)
  test("a downloaded JPEG banner reports its pixel size", async () => {
    const link = "https://example.test/photo.jpg";
    const jpeg = new Uint8Array([
      0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0, 0xff, 0xc0, 0, 11, 8, 0x01, 0x2c, 0x04, 0xb0, 3, 0, 0, 0,
    ]);
    const { deps } = setup({ [link]: { status: 200, contentType: "image/jpeg", bytes: jpeg } });
    const banner = await fetchBanner(link, deps);
    expect([banner.width, banner.height]).toEqual([1200, 300]);
  });

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#spec-module-banner-cache@jj:093e16ca
  // "Output BannerFile: ... the image's width and height in pixels" (a GIF banner)
  test("a downloaded GIF banner reports its pixel size", async () => {
    const link = "https://example.test/anim.gif";
    const gif = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0xb0, 0x04, 0x2c, 0x01]);
    const { deps } = setup({ [link]: { status: 200, contentType: "image/gif", bytes: gif } });
    const banner = await fetchBanner(link, deps);
    expect([banner.width, banner.height]).toEqual([1200, 300]);
  });

  // Spec: docs/specs/in-progress/executing-nerd-herd-spaces.html#spec-module-banner-cache@jj:093e16ca
  // "a non-image is fix (correct the link)": an image whose pixel size nerd-herd cannot read cannot be drawn to size
  test("an image whose pixel size cannot be read is refused as not an image", async () => {
    const link = "https://example.test/pic.webp";
    const { deps, files } = setup({
      [link]: { status: 200, contentType: "image/webp", bytes: new Uint8Array([82, 73, 70, 70]) },
    });
    const error = await rejection(fetchBanner(link, deps));
    expect([error.userAction, files.saved.size]).toEqual(["fix", 0]);
  });

  // Statement gained when the walk found two loads at once failing on one shared download file:
  // "Output BannerFile: ... the file at that path holds the same bytes" holds for overlapping fetches too.
  test("two banners fetched at the same time each keep their own bytes", async () => {
    const work = "https://example.test/work.png";
    const home = "https://example.test/home.png";
    const workBytes = png(240, 60, 1);
    const homeBytes = png(240, 60, 2);
    const { deps, files } = setup({
      [work]: { status: 200, contentType: "image/png", bytes: workBytes },
      [home]: { status: 200, contentType: "image/png", bytes: homeBytes },
    });
    const [a, b] = await Promise.all([fetchBanner(work, deps), fetchBanner(home, deps)]);
    expect([files.saved.get(a.path), files.saved.get(b.path)]).toEqual([workBytes, homeBytes]);
  });
});
