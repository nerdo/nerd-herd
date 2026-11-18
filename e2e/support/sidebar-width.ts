// Reads the sidebar's width from a Herdr layout file, for walks that read only the sidebar.

/** The sidebar block's width in points, found by its id in a layout. */
export function findSidebarPx(node: unknown): number {
  if (typeof node !== "object" || node === null) return 0;
  if ("id" in node && node.id === "sidebar" && "size" in node) {
    const size = node.size;
    if (typeof size === "object" && size !== null && "px" in size && typeof size.px === "number")
      return size.px;
  }
  const children =
    "children" in node && Array.isArray(node.children) ? node.children : Object.values(node);
  return children.reduce((found: number, child: unknown) => found || findSidebarPx(child), 0);
}
