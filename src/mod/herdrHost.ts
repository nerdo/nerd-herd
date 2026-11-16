import { machines, setShared, shared } from "herdr";
import type { Machine } from "../core/groups/groupModel";
import type { SharedState } from "../core/store/savedGroupStore";

/** What the composition root needs from Herdr, so the core never imports Herdr itself. */
export interface Host {
  readonly shared: SharedState;
  machines(): Machine[];
}

export const herdrHost: Host = {
  shared: {
    read: (key) => shared(key),
    write: (key, value) => {
      setShared(key, value);
    },
  },
  machines: () => machines().map((m) => ({ name: m.name })),
};
