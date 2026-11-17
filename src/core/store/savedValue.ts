import { SavedDataError, type SavedDataName } from "../errors/savedDataError";
import { z } from "../schema/zod";
import type { SharedKey, SharedState } from "./savedGroupStore";

/** What reading raw saved data gave: the value, or why it could not be read. */
export type Parsed<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly cause: unknown };

export interface SavedRead<T> {
  readonly value: T;
  readonly problem: SavedDataError | null;
}

export interface SavedValue<T> {
  load(): SavedRead<T>;
  save(value: T): void;
  /** Reads the backup again; restores it when it can be read now. True when restored. */
  retry(): boolean;
  /** Stops reporting the backup's problem; the backup is kept. True when there was one to dismiss. */
  dismiss(): boolean;
}

/** The backup of damaged data: the data as found, and the reference the user was shown for it. */
const Backup = z.object({
  data: z.unknown(),
  errorId: z.string().min(1),
  unixTimestamp: z.number(),
  /** Set when the user dismissed the card; the backup is still kept. */
  dismissed: z.boolean().optional(),
});

/**
 * A value kept in Herdr's shared state under `key`. Data that cannot be read is moved to
 * `<key>.backup` with a new reference, and the empty value is used. While the backup is kept,
 * every read reports that same reference, so the user's error card does not change. `retry` reads
 * the backup again and restores it when it can be read now (fixed by hand, or by a newer version).
 */
export const createSavedValue = <T>(
  shared: SharedState,
  key: SharedKey,
  name: SavedDataName,
  empty: T,
  parse: (raw: unknown) => Parsed<T>,
): SavedValue<T> => {
  const backupKey = `${key}.backup`;
  const backup = () => {
    const parsed = Backup.safeParse(shared.read(backupKey));
    return parsed.success ? parsed.data : null;
  };
  const problem = (b: z.infer<typeof Backup>, cause?: unknown) =>
    new SavedDataError(name, {
      cause,
      reference: { errorId: b.errorId, unixTimestamp: b.unixTimestamp },
    });
  return {
    load: () => {
      const raw = shared.read(key);
      const kept = backup();
      const shown = kept && !kept.dismissed ? problem(kept) : null;
      if (raw === undefined || raw === null) return { value: empty, problem: shown };
      const parsed = parse(raw);
      if (parsed.ok) return { value: parsed.value, problem: shown };
      const fresh = new SavedDataError(name, { cause: parsed.cause });
      const made = kept ? { ...kept, dismissed: false } : { data: raw, ...fresh.metadata };
      shared.write(backupKey, made);
      shared.write(key, empty);
      return { value: empty, problem: problem(made, parsed.cause) };
    },
    save: (value) => shared.write(key, value),
    retry: () => {
      const kept = backup();
      if (!kept) return false;
      const parsed = parse(kept.data);
      if (!parsed.ok) return false;
      shared.write(key, parsed.value);
      shared.write(backupKey, null);
      return true;
    },
    dismiss: () => {
      const kept = backup();
      if (!kept) return false;
      shared.write(backupKey, { ...kept, dismissed: true });
      return true;
    },
  };
};
