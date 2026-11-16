// The one place the end-to-end tests read their settings, each with its default beside it.
// The test home must stay a short path: Herdr's control socket path has a macOS length limit.

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export const e2eSettings = {
  home: process.env.E2E_HERDR_HOME ?? resolve(root, ".e2e-home"),
  fakeBin: process.env.E2E_FAKE_BIN ?? resolve(root, ".e2e-bin/fakebin"),
  readText: process.env.E2E_READ_TEXT ?? resolve(root, ".e2e-bin/read-text"),
  bannerFixture: resolve(root, "e2e/fixtures/work-banner.png"),
} as const;
