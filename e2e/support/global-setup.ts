// Before any end-to-end test: quit test windows an earlier, interrupted run may have left open.
import { spawn, spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import { join } from "node:path";
import { e2eSettings } from "./e2e-settings";

export default function globalSetup(): void {
  // The user, 2026-11-17: "use caffeinate to keep every thing awake during testing". A sleeping
  // display put the test window on a desktop yabai could not reach. caffeinate keeps the displays
  // (-d), the system (-i, -s), and the disk (-m) awake until this run's process (-w) ends.
  if (process.platform === "darwin")
    spawn("caffeinate", ["-dims", "-w", String(process.pid)], {
      stdio: "ignore",
      detached: true,
    }).unref();
  // Screenshots from an earlier run would mix with this run's.
  if (process.env.E2E_KEEP_SHOTS === undefined)
    rmSync(e2eSettings.shots, { recursive: true, force: true });
  spawnSync("bun", [join(import.meta.dirname, "../../scripts/stop-window.ts")], {
    env: { ...process.env, HERDR_APP_HOME: e2eSettings.home },
    stdio: "ignore",
  });
}
