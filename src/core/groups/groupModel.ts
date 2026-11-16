import type { ModAction } from "../modAction";
import { sortOrder } from "../sorting/sortOrder";

// STUB (walking skeleton): passes the actions inward and prefixes its own name.
export const groupRows = (actions: readonly ModAction[]): string =>
  `STUB groups > ${sortOrder(actions)}`;
