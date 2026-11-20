// The one place the end-to-end tests read their settings, each with its default beside it.
// The test home must stay a short path: Herdr's control socket path has a macOS length limit.

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export const e2eSettings = {
  home: process.env.E2E_HERDR_HOME ?? resolve(root, ".e2e-home"),
  fakeBin: process.env.E2E_FAKE_BIN ?? resolve(root, ".e2e-bin/fakebin"),
  readText: process.env.E2E_READ_TEXT ?? resolve(root, ".e2e-bin/read-text"),
  /** Where every screenshot a walk reads is kept, so a failed reading can be checked afterward. */
  shots: process.env.E2E_SHOTS ?? resolve(root, ".e2e-bin/shots"),
  bannerFixture: resolve(root, "e2e/fixtures/work-banner.png"),
  /** The test window's size in points, seeded in the test home's window.json (the user, 2026-11-17). */
  windowSize: { width: 1200, height: 900 },
  /**
   * Herdr's appearance in the test home. The walks read the screen, and the text reader misses dim
   * labels on a dark background, so the appearance is set rather than taken from the system's
   * (2026-11-17: the Mac switched to dark and 16 walks failed to read their labels).
   */
  appearance: "light",
  /** The herdr-core session a walk's private core runs as (HC_SESSION); never the person's own. */
  coreSession: process.env.E2E_CORE_SESSION ?? "nerd-herd-e2e",
} as const;
