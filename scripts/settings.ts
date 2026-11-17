// The one place the project scripts read their settings, each with its default beside it.
import { homedir } from "node:os";
import { join } from "node:path";

const defaultHome = join(homedir(), ".config/herdr-app");

export const scriptSettings = {
  /** The Herdr home the mod is installed into; a test window sets its own. */
  herdrHome: process.env.HERDR_APP_HOME ?? defaultHome,
  /** True when HERDR_APP_HOME names another home than the person's own. */
  isOwnHome: (process.env.HERDR_APP_HOME ?? defaultHome) === defaultHome,
  herdrBinary: process.env.HERDR_BINARY ?? "/Applications/Herdr.app/Contents/MacOS/Herdr",
  windowWaitMs: 30_000,
  /**
   * How a test window starts: "background" (default) through macOS's open -g, leaving the app in
   * front where it was; "direct" runs Herdr itself, which takes the front for a moment but keeps
   * this PATH (Herdr gives a Finder-style launch the login shell's PATH instead).
   */
  launch: process.env.NERD_HERD_LAUNCH === "direct" ? "direct" : "background",
} as const;
