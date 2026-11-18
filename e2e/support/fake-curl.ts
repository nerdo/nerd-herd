// The walks' curl: Herdr runs it for banner links, and it answers with the committed banner fixture,
// so the walks need no internet.

import { chmodSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { e2eSettings } from "./e2e-settings";

/** Writes the fake curl into the walks' fake bin folder, which the test window's PATH puts first. */
export function prepareFakeCurl(): void {
  mkdirSync(e2eSettings.fakeBin, { recursive: true });
  const script = [
    "#!/bin/sh",
    "# Test double for curl: copies the banner fixture to the -o path and prints what the real call prints.",
    "# A call with no -o path, such as Herdr's update check, fails as an unreachable server (exit 7).",
    'out=""; prev=""',
    'for a in "$@"; do if [ "$prev" = "-o" ]; then out="$a"; fi; prev="$a"; done',
    '[ -n "$out" ] || exit 7',
    `cp "${e2eSettings.bannerFixture}" "$out"`,
    `printf '200 image/png %s' "$(wc -c < "${e2eSettings.bannerFixture}" | tr -d ' ')"`,
    "",
  ].join("\n");
  writeFileSync(join(e2eSettings.fakeBin, "curl"), script);
  chmodSync(join(e2eSettings.fakeBin, "curl"), 0o755);
}
