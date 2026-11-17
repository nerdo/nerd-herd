// Types for the vendored Herdr Spaces mod: the class and the nerd-herd hooks it calls.
import type { AsyncContext, Element } from "gpui-kit";

export type LayoutRow =
  | { readonly kind: "machine"; readonly name: string | null; readonly depth: number }
  | { readonly kind: "group" | "ungrouped"; readonly [key: string]: unknown };

export class Spaces {
  init(props: unknown, cx: AsyncContext): void;
  render(): Element;
  layoutRows(remote: string[]): readonly LayoutRow[];
  groupHeader(row: never, t: Record<string, string>, collapsed: boolean): Element;
  ungroupedHeader(row: never, t: Record<string, string>, collapsed: boolean): Element;
  headerTools(t: Record<string, string>, collapsed: boolean): Element;
  belowHeader(t: Record<string, string>, collapsed: boolean): Element;
}
