import type { CartItem, MenuItem, Offer } from '../types';

/** Cheapest menu row in the free pool (by base price). */
export function pickCheapestFreeMenuItem(menuItems: MenuItem[], freeIds: Set<string>): MenuItem | null {
  const candidates = menuItems.filter((m) => freeIds.has(m.id) && m.available);
  if (candidates.length === 0) return null;
  return candidates.reduce((a, b) => (a.basePrice <= b.basePrice ? a : b));
}

function activeBogoAnyOffer(offers: Offer[]): Offer | null {
  const now = new Date();
  return (
    offers.find(
      (x) =>
        x.offerKind === 'bogo_any' &&
        x.active &&
        new Date(x.validFrom) <= now &&
        new Date(x.validUntil) >= now &&
        (x.bogoFreeItemIds?.length ?? 0) > 0 &&
        x.applicableItemIds.length > 0
    ) ?? null
  );
}

/**
 * Drops auto BOGO lines, then adds one consolidated free line if needed:
 * auto qty = max(0, paidQty − manual free qty). Manual free = items in the free pool without bogoAutoFree.
 */
export function reconcileBogoAnyAutoLines(cart: CartItem[], offers: Offer[], menuItems: MenuItem[]): CartItem[] {
  const offer = activeBogoAnyOffer(offers);
  const base = cart.filter((line) => !line.bogoAutoFree);

  if (!offer) {
    return base;
  }

  const buyIds = new Set(offer.applicableItemIds);
  const freeIds = new Set(offer.bogoFreeItemIds ?? []);
  const cheapest = pickCheapestFreeMenuItem(menuItems, freeIds);
  if (!cheapest) {
    return base;
  }

  const paidCount = base.reduce((sum, line) => {
    if (line.bogoSameAutoFree) return sum;
    if (!buyIds.has(line.menuItem.id)) return sum;
    return sum + line.quantity;
  }, 0);

  const manualFreeCount = base.reduce((sum, line) => {
    if (line.bogoSameAutoFree) return sum;
    if (!freeIds.has(line.menuItem.id)) return sum;
    return sum + line.quantity;
  }, 0);

  const targetAutoQty = Math.max(0, paidCount - manualFreeCount);
  if (targetAutoQty <= 0) {
    return base;
  }

  const autoLine: CartItem = {
    id: `bogo-auto-${offer.id}`,
    menuItem: cheapest,
    selectedOptions: [],
    quantity: targetAutoQty,
    totalPrice: cheapest.basePrice,
    bogoAutoFree: { offerId: offer.id },
  };

  return [...base, autoLine];
}
