import type { BannerLink } from "../banners/bannerCache";
import type { SavedGroups } from "../groups/groupModel";
import { z } from "../schema/zod";
import { CommandError, resolve } from "./applyCommand";

const payload = z.object({ group: z.string().min(1) });

/** The banner links a `banner-reload:{"group":…}` command loads again: that group's open and folded links. */
export const bannerReloadLinks = (saved: SavedGroups, command: string): BannerLink[] => {
  let json: unknown;
  try {
    json = JSON.parse(command.slice(command.indexOf(":") + 1));
  } catch (cause) {
    throw new CommandError(command, { cause });
  }
  const parsed = payload.safeParse(json);
  if (!parsed.success) throw new CommandError(command, { cause: parsed.error });
  const id = resolve(saved, parsed.data.group, command);
  const group = saved.groups.find((g) => g.id === id);
  return [group?.openBanner, group?.foldedBanner].flatMap((l) => (l ? [l] : []));
};
