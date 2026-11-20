// The Agents list's rows, or the error to show in their place when reading them failed.
import { NerdHerdError } from "../errors/nerdHerdError";
import type { AgentsRow } from "./sessionList";

/** The Agents list could not be read or arranged; the person is shown a reference to report. */
export class AgentsListError extends NerdHerdError {
  readonly userAction = "report";
  constructor(cause: unknown) {
    super({ cause });
    this.setMessage(`Something went wrong on our end. Reference ${this.metadata.errorId}.`);
  }
}

export const rowsOrError = (read: () => AgentsRow[]): AgentsRow[] | AgentsListError => {
  try {
    return read();
  } catch (cause) {
    return new AgentsListError(cause);
  }
};
