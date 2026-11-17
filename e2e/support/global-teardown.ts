// After every end-to-end test: quit any test window left open. Screenshots stay for checking.
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { e2eSettings } from "./e2e-settings";

export default function globalTeardown(): void {
  spawnSync("bun", [join(import.meta.dirname, "../../scripts/stop-window.ts")], {
    env: { ...process.env, HERDR_APP_HOME: e2eSettings.home },
    stdio: "ignore",
  });
}
