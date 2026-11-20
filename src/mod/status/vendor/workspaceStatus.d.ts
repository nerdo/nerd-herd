// Types for a vendored status bar (scripts/vendor-status.ts): a Herdr view class.
import type { AsyncContext, Element } from "gpui-kit";

export default class StatusBar {
  init(props: unknown, cx: AsyncContext): void;
  render(cx: AsyncContext): Element;
}
