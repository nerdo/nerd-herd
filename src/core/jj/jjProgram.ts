// Which program runs jj on a machine. Herdr runs a mod's commands on another machine with that
// machine's default PATH, not the user's login PATH (only Herdr's agent launcher loads the login
// shell), so a jj in ~/.local/bin, cargo or mise is not found by name there. The user's login shell
// on that machine is asked once where jj is, and jj then runs by that path.

/** Runs a POSIX sh script on a machine and answers what it printed. */
export type RunOnMachine = (
  machine: string,
  script: string,
) => Promise<{ code: number; stdout: string }>;

/** Asks the account's login shell (getent, else macOS's dscl, else $SHELL) where jj is. Profiles
 * may print banners first; the answer is the last line that is an absolute path. */
export const loginShellJjScript = [
  'u="$(id -un)"',
  'shell="$(getent passwd "$u" 2>/dev/null | cut -d: -f7)"',
  '[ -n "$shell" ] || shell="$(dscl . -read "/Users/$u" UserShell 2>/dev/null | sed -n "s/^UserShell: //p")"',
  '[ -x "$shell" ] || shell="$SHELL"',
  '[ -x "$shell" ] || shell=/bin/sh',
  "\"$shell\" -lc 'command -v jj' </dev/null 2>/dev/null",
].join("\n");

/** How long a machine whose login shell found no jj answers jj by name before it is asked again. */
const retryNotFoundMs = 60_000;

export function jjProgramLookup(
  run: RunOnMachine,
  now: () => number,
): (machine: string | null) => Promise<string> {
  const known = new Map<string, { program: string; found: boolean; at: number }>();
  return async (machine) => {
    if (!machine) return "jj";
    const was = known.get(machine);
    if (was && (was.found || now() - was.at < retryNotFoundMs)) return was.program;
    const r = await run(machine, loginShellJjScript).catch(() => null);
    const path =
      r?.code === 0
        ? r.stdout
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.startsWith("/"))
            .pop()
        : undefined;
    known.set(machine, { program: path ?? "jj", found: Boolean(path), at: now() });
    return path ?? "jj";
  };
}
