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
 * Buy 1 get 1 free on the same SKU + options: when the customer has exactly one qualifying unit
 * across cart lines, add a second unit automatically (mirrors bogo_any auto line).
 */
export function reconcileBogoSameAutoLines(cart: CartItem[], offers: Offer[]): CartItem[] {
  const offer = activeBogoSameOffer(offers);
  const base = cart.filter((line) => !line.bogoSameAutoFree);

  if (!offer) {
    return base;
  }

  const applicable = new Set(offer.applicableItemIds);
  const groups = new Map<
    string,
    { userQty: number; template: CartItem }
  >();

  for (const line of base) {
    if (line.bogoAutoFree) continue;
    if (!applicable.has(line.menuItem.id)) continue;

    const key = `${line.menuItem.id}::${optionsKey(line)}`;
    const prev = groups.get(key);
    const addQty = line.quantity;
    if (!prev) {
      groups.set(key, { userQty: addQty, template: line });
    } else {
      groups.set(key, {
        userQty: prev.userQty + addQty,
        template: prev.template,
      });
    }
  }

  const extra: CartItem[] = [];
  for (const [, { userQty, template }] of groups) {
    if (userQty !== 1) continue;
    extra.push({
      ...template,
      id: stableAutoId(offer.id, template),
      quantity: 1,
      bogoSameAutoFree: { offerId: offer.id },
    });
  }

  return [...base, ...extra];
}
