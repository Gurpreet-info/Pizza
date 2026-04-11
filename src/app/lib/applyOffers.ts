import { CartItem, Offer, SpendRewardType } from '../types';

function optionsKey(item: CartItem): string {
  return item.selectedOptions
    .flatMap((g) => g.options.map((o) => o.id))
    .sort()
    .join(',');
}

type UnitSlot = { lineIndex: number; unitPrice: number };

function applyBogoDiscountToLines(items: CartItem[], slots: UnitSlot[], offer: Offer): CartItem[] {
  if (slots.length < 2) {
    return items;
  }
  const sorted = [...slots].sort((a, b) => a.unitPrice - b.unitPrice);
  const freeCount = Math.floor(sorted.length / 2);
  const discountByLine = new Map<number, number>();
  for (let i = 0; i < freeCount; i++) {
    const s = sorted[i];
    discountByLine.set(s.lineIndex, (discountByLine.get(s.lineIndex) || 0) + s.unitPrice);
  }
  const next = [...items];
  discountByLine.forEach((totalDiscount, lineIndex) => {
    const line = next[lineIndex];
    const perUnitAdd = totalDiscount / line.quantity;
    next[lineIndex] = {
      ...line,
      offerDiscount: (line.offerDiscount || 0) + perUnitAdd,
      appliedOffer: offer,
    };
  });
  return next;
}

function applyBogoSame(items: CartItem[], offer: Offer): CartItem[] {
  let next = [...items];
  const groups = new Map<string, UnitSlot[]>();
  items.forEach((item, lineIndex) => {
    if (!offer.applicableItemIds.includes(item.menuItem.id)) {
      return;
    }
    const key = `${item.menuItem.id}::${optionsKey(item)}`;
    const arr = groups.get(key) || [];
    for (let q = 0; q < item.quantity; q++) {
      arr.push({ lineIndex, unitPrice: item.totalPrice });
    }
    groups.set(key, arr);
  });
  for (const slots of groups.values()) {
    if (slots.length < 2) {
      continue;
    }
    next = applyBogoDiscountToLines(next, slots, offer);
  }
  return next;
}

/** Discount the cheapest `pairs` units from the free pool (per-unit BOGO pairing). */
function applyBogoDiscountToFreeUnits(
  items: CartItem[],
  freeSlots: UnitSlot[],
  pairs: number,
  offer: Offer
): CartItem[] {
  if (pairs <= 0 || freeSlots.length === 0) {
    return items;
  }
  const sortedFree = [...freeSlots].sort((a, b) => a.unitPrice - b.unitPrice);
  const toDiscount = sortedFree.slice(0, pairs);
  const discountByLine = new Map<number, number>();
  for (const s of toDiscount) {
    discountByLine.set(s.lineIndex, (discountByLine.get(s.lineIndex) || 0) + s.unitPrice);
  }
  const next = [...items];
  discountByLine.forEach((totalDiscount, lineIndex) => {
    const line = next[lineIndex];
    const perUnitAdd = totalDiscount / line.quantity;
    next[lineIndex] = {
      ...line,
      offerDiscount: (line.offerDiscount || 0) + perUnitAdd,
      appliedOffer: offer,
    };
  });
  return next;
}

/** Paid pool + separate free pool; each paid unit can make one free-pool unit free. */
function applyBogoAny(items: CartItem[], offer: Offer): CartItem[] {
  const buyIds = new Set(offer.applicableItemIds);
  const freeIds = new Set(offer.bogoFreeItemIds ?? []);

  if (freeIds.size === 0) {
    const slots: UnitSlot[] = [];
    items.forEach((item, lineIndex) => {
      if (!offer.applicableItemIds.includes(item.menuItem.id)) {
        return;
      }
      for (let q = 0; q < item.quantity; q++) {
        slots.push({ lineIndex, unitPrice: item.totalPrice });
      }
    });
    return applyBogoDiscountToLines([...items], slots, offer);
  }

  const buySlots: UnitSlot[] = [];
  const freeSlots: UnitSlot[] = [];
  items.forEach((item, lineIndex) => {
    const id = item.menuItem.id;
    const inBuy = buyIds.has(id);
    const inFree = freeIds.has(id);
    if (!inBuy && !inFree) {
      return;
    }
    /**
     * Cart line the app added as the free (“get”) side must always count toward the free pool,
     * even when this SKU is also listed as a buy item — otherwise offerDiscount stays 0 and the
     * customer is charged full price for the auto line.
     */
    if (item.bogoAutoFree) {
      if (inFree) {
        for (let q = 0; q < item.quantity; q++) {
          freeSlots.push({ lineIndex, unitPrice: item.totalPrice });
        }
      }
      return;
    }
    if (inBuy && inFree) {
      return;
    }
    if (inBuy) {
      for (let q = 0; q < item.quantity; q++) {
        buySlots.push({ lineIndex, unitPrice: item.totalPrice });
      }
    }
    if (inFree) {
      for (let q = 0; q < item.quantity; q++) {
        freeSlots.push({ lineIndex, unitPrice: item.totalPrice });
      }
    }
  });

  const pairs = Math.min(buySlots.length, freeSlots.length);
  return applyBogoDiscountToFreeUnits([...items], freeSlots, pairs, offer);
}

/**
 * Auto-added `bogo_any` lines must always net $0. Runs after every other rule so it still applies
 * when `bogo_same` wins the earlier branch (both special types can be active at once).
 */
function ensureAutoBogoFreeLinesPricedAtZero(items: CartItem[], activeOffers: Offer[]): CartItem[] {
  const bogoAnyById = new Map(
    activeOffers.filter((o) => o.offerKind === 'bogo_any').map((o) => [o.id, o])
  );
  const fallbackBogoAny = activeOffers.find((o) => o.offerKind === 'bogo_any');

  return items.map((item) => {
    if (!item.bogoAutoFree) return item;
    const offer =
      bogoAnyById.get(item.bogoAutoFree.offerId) ?? fallbackBogoAny ?? undefined;
    return {
      ...item,
      offerDiscount: item.totalPrice,
      appliedOffer: offer,
    };
  });
}

/** Pro‑rata order discount across lines by current net line totals (after BOGO / standard). */
function distributeSpendOrderDiscount(items: CartItem[], offer: Offer, totalDiscount: number): CartItem[] {
  const lineNets = items.map((i) => {
    const u = i.totalPrice - (i.offerDiscount || 0);
    return Math.max(0, u * i.quantity);
  });
  const W = lineNets.reduce((a, b) => a + b, 0);
  if (W <= 0 || totalDiscount <= 0) {
    return items;
  }
  const capped = Math.min(totalDiscount, W);
  const next = [...items];
  let allocated = 0;
  const n = items.length;
  for (let i = 0; i < n; i++) {
    const share = i === n - 1 ? capped - allocated : (capped * lineNets[i]) / W;
    allocated += share;
    const perUnitAdd = share / next[i].quantity;
    next[i] = {
      ...next[i],
      offerDiscount: (next[i].offerDiscount || 0) + perUnitAdd,
      appliedOffer: offer,
    };
  }
  return next;
}

function applySpendGetFree(items: CartItem[], offer: Offer): CartItem[] {
  const minSpend = offer.minSpend;
  if (minSpend == null) {
    return items;
  }
  const subtotal = items.reduce((sum, i) => {
    const netUnit = i.totalPrice - (i.offerDiscount || 0);
    return sum + netUnit * i.quantity;
  }, 0);
  if (subtotal < minSpend) {
    return items;
  }

  const rewardType: SpendRewardType = offer.spendRewardType ?? 'free_item';

  if (rewardType === 'percent_off') {
    const pct = offer.spendRewardPercent ?? 0;
    if (pct <= 0) {
      return items;
    }
    const totalDiscount = Math.min(subtotal, subtotal * (pct / 100));
    return distributeSpendOrderDiscount(items, offer, totalDiscount);
  }

  if (rewardType === 'fixed_amount') {
    const fixed = offer.spendRewardFixedAmount ?? 0;
    if (fixed <= 0) {
      return items;
    }
    const totalDiscount = Math.min(subtotal, fixed);
    return distributeSpendOrderDiscount(items, offer, totalDiscount);
  }

  const rewardId = offer.rewardMenuItemId;
  if (rewardId == null) {
    return items;
  }
  let bestIdx = -1;
  let bestUnitNet = Infinity;
  items.forEach((item, idx) => {
    if (item.menuItem.id !== rewardId) {
      return;
    }
    const unitNet = item.totalPrice - (item.offerDiscount || 0);
    if (unitNet > 0 && unitNet < bestUnitNet) {
      bestUnitNet = unitNet;
      bestIdx = idx;
    }
  });
  if (bestIdx < 0) {
    return items;
  }
  const line = items[bestIdx];
  const perUnitAdd = bestUnitNet / line.quantity;
  const next = [...items];
  next[bestIdx] = {
    ...line,
    offerDiscount: (line.offerDiscount || 0) + perUnitAdd,
    appliedOffer: offer,
  };
  return next;
}

/** Apply active promotional rules without mutating input cart lines. */
export function applyOffersToCart(cartItems: CartItem[], activeOffers: Offer[]): CartItem[] {
  const standardOffers = activeOffers.filter(
    (o) => (o.offerKind ?? 'standard') === 'standard'
  );
  const specials = activeOffers.filter((o) => (o.offerKind ?? 'standard') !== 'standard');

  let items: CartItem[] = cartItems.map((item) => ({
    ...item,
    appliedOffer: undefined,
    offerDiscount: undefined,
  }));

  items = items.map((item) => {
    const applicableOffer = standardOffers.find((o) => o.applicableItemIds.includes(item.menuItem.id));
    if (!applicableOffer) {
      return item;
    }
    const discount =
      applicableOffer.discountType === 'percentage'
        ? item.totalPrice * (applicableOffer.discountValue / 100)
        : applicableOffer.discountValue;
    return {
      ...item,
      appliedOffer: applicableOffer,
      offerDiscount: discount,
    };
  });

  const bogoSame = specials.find((o) => o.offerKind === 'bogo_same');
  const bogoAny = specials.find((o) => o.offerKind === 'bogo_any');
  /** Run both when configured so auto-added bogo_same lines still get discounts if bogo_any is also active. */
  if (bogoSame) {
    items = applyBogoSame(items, bogoSame);
  }
  if (bogoAny) {
    items = applyBogoAny(items, bogoAny);
  }

  const spend = specials.find((o) => o.offerKind === 'spend_get_free');
  if (spend) {
    items = applySpendGetFree(items, spend);
  }

  items = ensureAutoBogoFreeLinesPricedAtZero(items, activeOffers);

  return items;
}
