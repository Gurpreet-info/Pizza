import type { MenuItem, Offer } from '../types';
import { spendGetFreeMenuBadge } from './spendOfferDisplay';

export type MenuItemOfferDisplay = {
  offer: Offer;
  badgeText: string;
};

function paidItemNamesForBogoAny(offer: Offer, menuItems: MenuItem[]): string[] {
  return offer.applicableItemIds
    .map((id) => menuItems.find((m) => m.id === id)?.name)
    .filter((n): n is string => Boolean(n));
}

/**
 * Per-menu-item offer badge for the menu grid (standard, spend, bogo_same, bogo_any).
 */
export function getMenuItemOfferDisplay(
  itemId: string,
  activeOffers: Offer[],
  menuItems: MenuItem[]
): MenuItemOfferDisplay | null {
  for (const offer of activeOffers) {
    const kind = offer.offerKind ?? 'standard';
    if (kind === 'bogo_same' && offer.applicableItemIds.includes(itemId)) {
      return { offer, badgeText: 'Buy 1 get 1 free' };
    }
  }

  for (const offer of activeOffers) {
    const kind = offer.offerKind ?? 'standard';
    if (kind !== 'bogo_any') continue;

    const freeIds = offer.bogoFreeItemIds ?? [];
    if (freeIds.includes(itemId)) {
      const paidNames = paidItemNamesForBogoAny(offer, menuItems);
      const paidLabel =
        paidNames.length === 1
          ? paidNames[0]
          : paidNames.length > 1
            ? paidNames.join(', ')
            : 'qualifying item';
      return { offer, badgeText: `Free with ${paidLabel}` };
    }

    if (offer.applicableItemIds.includes(itemId)) {
      return { offer, badgeText: 'Buy 1 get a free item' };
    }
  }

  for (const offer of activeOffers) {
    const kind = offer.offerKind ?? 'standard';
    if (kind === 'spend_get_free') {
      const t = offer.spendRewardType ?? 'free_item';
      if (t === 'free_item' && offer.rewardMenuItemId === itemId) {
        return { offer, badgeText: spendGetFreeMenuBadge(offer) };
      }
      continue;
    }
    if (kind === 'standard' && offer.applicableItemIds.includes(itemId)) {
      const badgeText =
        offer.discountType === 'percentage'
          ? `${offer.discountValue}% off`
          : `$${offer.discountValue} off`;
      return { offer, badgeText };
    }
  }

  return null;
}
