import { describe, expect, test } from "bun:test";
import { png, rejection, setup } from "./bannerTestFakes";
import { fetchBanner } from "./fetchBanner";

// The user, 2026-11-17: "can the banner link not be a local url? What if I have the banner on disk
// and it's not hosted anywhere?" A banner may name a file on this computer: an absolute path, a path
// under ~/, or a file:// link. The file is read, checked as an image, and kept like a download.
describe("a banner from a file on this computer", () => {
  test("a path under ~/ becomes a banner holding that file's bytes, with nothing downloaded", async () => {
    const bytes = png(240, 60, 5);
    const { deps, files, downloader } = setup({}, { "/Users/test/banners/work.png": bytes });
    const banner = await fetchBanner("~/banners/work.png", deps);
    expect([files.saved.get(banner.path), downloader.asked.length]).toEqual([bytes, 0]);
  });

  test("an absolute path is read from that path", async () => {
    const bytes = png(300, 80);
    const { deps, files } = setup({}, { "/Volumes/art/work.png": bytes });
    const banner = await fetchBanner("/Volumes/art/work.png", deps);
    expect(files.saved.get(banner.path)).toEqual(bytes);
  });

  test("a file:// link is read from the path it names, with escaped spaces decoded", async () => {
    const bytes = png(300, 80, 3);
    const { deps, files } = setup({}, { "/Users/test/My Banners/work.png": bytes });
    const banner = await fetchBanner("file:///Users/test/My%20Banners/work.png", deps);
    expect(files.saved.get(banner.path)).toEqual(bytes);
  });

  test("a file that cannot be read is reported with its path, to be fixed", async () => {
    const { deps } = setup({});
    const error = await rejection(fetchBanner("~/missing.png", deps));
    expect([error.userAction, error.message]).toEqual([
      "fix",
      "Couldn't read the banner file /Users/test/missing.png. Check the path in the group's settings; the file has to be inside your home folder.",
    ]);
  });

  // Herdr's readFile throws at once, without a rejected promise, for a path outside the folders it
  // lets a mod read (2026-11-18: a /private/tmp banner link ended the mod's command loop).
  test("a file Herdr refuses at once is reported with its path, to be fixed", async () => {
    const { deps } = setup({});
    const refusing = {
      ...deps,
      localFiles: {
        read: (path: string): Promise<Uint8Array> => {
          throw new Error(`${path} is outside every granted read root`);
        },
      },
    };
    const error = await rejection(fetchBanner("/private/tmp/work.png", refusing));
    expect([error.userAction, error.message]).toEqual([
      "fix",
      "Couldn't read the banner file /private/tmp/work.png. Check the path in the group's settings; the file has to be inside your home folder.",
    ]);
  });

  test("a file that is not a PNG, GIF, or JPEG image is refused", async () => {
    const { deps } = setup({}, { "/Users/test/notes.txt": new TextEncoder().encode("hello") });
    const error = await rejection(fetchBanner("~/notes.txt", deps));
    expect([error.userAction, error.message]).toEqual([
      "fix",
      "The banner file is not a PNG, GIF, or JPEG image. Use an image file.",
    ]);
  });

  test("a file over 2 MB is refused and no banner file is kept", async () => {
    const { deps, files } = setup({}, { "/Users/test/huge.png": png(100, 100, 3 * 1024 * 1024) });
    const error = await rejection(fetchBanner("~/huge.png", deps));
    expect([error.message, files.saved.size]).toEqual([
      "The banner image is 3 MB; banners can be at most 2 MB. Use a smaller image.",
      0,
    ]);
  });
});
