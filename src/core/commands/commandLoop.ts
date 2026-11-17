import { NerdHerdError } from "../errors/nerdHerdError";

/** Applies each command in turn. A nerd-herd error is reported and the next command still runs;
 *  any other error is a defect and ends the loop. */
export const runCommands = async (
  commands: AsyncIterable<string> | Iterable<string>,
  apply: (command: string) => void | Promise<void>,
  report: (error: NerdHerdError) => void,
): Promise<void> => {
  for await (const command of commands) {
    try {
      await apply(command);
    } catch (error) {
      if (!(error instanceof NerdHerdError)) throw error;
      report(error);
    }
  }
};
