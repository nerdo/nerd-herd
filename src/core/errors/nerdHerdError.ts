// The root of nerd-herd's error tree (the user's error-handling standard: one root per package,
// metadata frozen at construction, a user-facing message rendered from fields, and a userAction).

export type UserAction = "fix" | "retry" | "report";
export type ErrorId = string;
export type UnixTimestamp = number;

export interface ErrorMetadata {
  readonly errorId: ErrorId;
  readonly unixTimestamp: UnixTimestamp;
}

export abstract class NerdHerdError extends Error {
  public readonly metadata: ErrorMetadata;
  public abstract readonly userAction: UserAction;

  constructor(options?: { cause?: unknown }) {
    super("", options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = this.constructor.name;
    this.metadata = Object.freeze({
      errorId: crypto.randomUUID(),
      unixTimestamp: Math.floor(Date.now() / 1000),
    });
  }

  protected setMessage(message: string): void {
    this.message = message;
  }
}
