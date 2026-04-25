import type { CartItem, Offer } from '../types';

function optionsKey(item: CartItem): string {
  return item.selectedOptions
    .flatMap((g) => g.options.map((o) => o.id))
    .sort()
    .join(',');
}

function stableAutoId(offerId: string, template: CartItem): string {
  const raw = `${offerId}-${template.menuItem.id}-${optionsKey(template)}`;
  return `bogo-same-auto-${raw.replace(/[^a-zA-Z0-9-]/g, '_')}`;
}

function activeBogoSameOffer(offers: Offer[]): Offer | null {
  const now = new Date();
  return (
    offers.find(
      (x) =>
        x.offerKind === 'bogo_same' &&
        x.active &&
        new Date(x.validFrom) <= now &&
        new Date(x.validUntil) >= now &&
        x.applicableItemIds.length > 0
    ) ?? null
  );
}

/**
 * For bogo_same we do NOT auto-insert free lines.
 * Offer math is handled in applyOffers based on actual user-selected quantity.
 */
export function reconcileBogoSameAutoLines(cart: CartItem[], offers: Offer[]): CartItem[] {
  const offer = activeBogoSameOffer(offers);
  const base = cart.filter((line) => !line.bogoSameAutoFree);

  if (!offer) {
    return base;
  }
  return base;
}
