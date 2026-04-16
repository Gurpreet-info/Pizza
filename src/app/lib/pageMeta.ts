/** Visible site name in browser tab and default SEO copy. */
export const SITE_NAME = 'Pizza Offers';

export const DEFAULT_META_DESCRIPTION =
  'Order pizza online with Pizza Offers — browse the menu, deals, coupons, and locations for pickup or delivery.';

const META_DESC_MAX = 160;

function truncateMetaDescription(text: string): string {
  const t = text.trim().replace(/\s+/g, ' ');
  if (t.length <= META_DESC_MAX) return t;
  return `${t.slice(0, META_DESC_MAX - 1).trimEnd()}…`;
}

/**
 * Sets `document.title` and the primary meta description (creates the tag if missing).
 */
export function applyPageMeta(title: string, description: string): void {
  const t = title.trim();
  document.title = t ? `${t} | ${SITE_NAME}` : SITE_NAME;

  const content = truncateMetaDescription(description || DEFAULT_META_DESCRIPTION);

  let el = document.querySelector('meta[name="description"]');
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', 'description');
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}
