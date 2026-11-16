import { NerdHerdError } from "./nerdHerdError";

export type SavedDataName = "groups" | "settings";

/** Saved nerd-herd data could not be read; it was kept as a backup and the defaults are in use. */
export class SavedDataError extends NerdHerdError {
  readonly userAction = "report";
  constructor(
    public readonly data: SavedDataName,
    options?: { cause?: unknown },
  ) {
    super(options);
    this.setMessage(
      `Your saved ${data} could not be read, so they were kept as a backup and the defaults are in use. Reference ${this.metadata.errorId}.`,
    );
  }
}
