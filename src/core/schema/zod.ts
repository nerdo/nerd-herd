// The one place nerd-herd loads its schema library. Herdr's mod runtime disables the Function
// constructor and freezes built-in objects, so ArkType (the first choice) cannot load there; Zod in its
// jitless mode runs (both checked with `herdr-app check`, 2026-11-16). Schemas import `z` from here so
// the jitless setting is applied before any schema exists.
import { z } from "zod";

z.config({ jitless: true });

export { z };
