// The dismiss key: cmd-e in Herdr's global keys, which act while a terminal has the keyboard (a
// mod's own section acts only while that mod has it). A terminal program never receives ⌘ keys.
import type { KeySections } from "./keyBindings";

const key = "cmd-e";
const action = "nerd-herd-agents.dismiss";

/** The person's keys with cmd-e bound to dismiss, unless they already bound cmd-e themselves. */
export const withDismissKey = (keys: KeySections): KeySections => {
  const global = keys.global ?? {};
  return key in global ? keys : { ...keys, global: { ...global, [key]: action } };
};
