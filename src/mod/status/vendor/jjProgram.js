// Runs jj on this computer or another machine. Herdr runs a mod's commands on another machine with
// that machine's default PATH, not the user's login PATH (only Herdr's agent launcher loads the
// login shell), so a jj in ~/.local/bin, cargo or mise is not found by name there. The user's login
// shell on that machine is asked once where jj is, and jj then runs by that path. A machine whose
// login shell finds no jj answers "jj" and is asked again after a minute.
// Same lookup as nerd-herd's src/core/jj/jjProgram.ts (tested there); a mod cannot import another
// mod's files, so each jj mod carries this copy.
import { exec } from "herdr";

const script = [
  'u="$(id -un)"',
  'shell="$(getent passwd "$u" 2>/dev/null | cut -d: -f7)"',
  '[ -n "$shell" ] || shell="$(dscl . -read "/Users/$u" UserShell 2>/dev/null | sed -n "s/^UserShell: //p")"',
  '[ -x "$shell" ] || shell="$SHELL"',
  "[ -x \"$shell\" ] || shell=/bin/sh",
  "\"$shell\" -lc 'command -v jj' </dev/null 2>/dev/null",
].join("\n");

const retryNotFoundMs = 60_000;
const known = new Map();

export async function jjProgram(machine) {
  if (!machine) return "jj";
  const was = known.get(machine);
  if (was && (was.found || Date.now() - was.at < retryNotFoundMs)) return was.program;
  const r = await exec("sh", ["-c", script], { on: machine }).catch(() => null);
  const path =
    r?.code === 0
      ? r.stdout
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.startsWith("/"))
          .pop()
      : undefined;
  known.set(machine, { program: path ?? "jj", found: Boolean(path), at: Date.now() });
  return path ?? "jj";
}

/** exec("jj", args, options), with jj found through the login shell on another machine. */
export async function execJj(args, options = {}) {
  return exec(await jjProgram(options.on ?? null), args, options);
}
