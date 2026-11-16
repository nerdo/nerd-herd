import type { ModAction } from "../modAction";
import { sortOrder } from "../sorting/sortOrder";

// STUB (walking skeleton): passes the actions inward as named items and reports what came back.
export const groupRows = (actions: readonly ModAction[]): string =>
  `STUB groups > sorted ${
    sortOrder(
      "custom",
      actions.map((name) => ({ name })),
    ).length
  } of ${actions.length}`;
