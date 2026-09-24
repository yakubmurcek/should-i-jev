/** Shared page metadata. Next replaces a layout's `openGraph` wholesale when a page sets
 * its own, so every page spreads these in rather than relying on inheritance. */
export const SITE_NAME = "Should I Jev?";
export const THEME_COLOR = "#0f0f0f";

export const OG_BASE = { siteName: SITE_NAME, locale: "en_US", type: "website" as const };
export const TWITTER_BASE = { card: "summary_large_image" as const, site: "@ykbmck", creator: "@ykbmck" };

/** Clip text to `max` chars on a word boundary, with an ellipsis when clipped. */
export function clip(text: string, max: number) {
  const t = text.trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(" ") > max / 2 ? cut.lastIndexOf(" ") : cut.length).replace(/[\s,.;:]+$/, "")}…`;
}
