import type { CartItem } from '../types';

/** True for app-inserted free BOGO lines (bogo_any free pool or bogo_same second unit). */
export function isCartAutoAddedBogoFreeLine(item: CartItem): boolean {
  return Boolean(item.bogoAutoFree || item.bogoSameAutoFree);
}

/** Net line total (list − per-unit offer discount) × qty — use for totals / tax base. */
export function cartLineNetTotal(item: CartItem): number {
  const disc = item.offerDiscount ?? 0;
  return (item.totalPrice - disc) * item.quantity;
}

/** Sum of net line totals (matches sum of per-line amounts shown in the cart). */
export function cartNetItemsSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + cartLineNetTotal(item), 0);
}

/** Sum of (per-unit offer discount × qty) on every line, including auto-added BOGO free rows. */
export function cartTotalOfferDiscountDollars(cartWithOffers: CartItem[]): number {
  return cartWithOffers.reduce((sum, item) => sum + (item.offerDiscount ?? 0) * item.quantity, 0);
}

/**
 * True when cart must not combine with a coupon: BOGO auto lines, any applied offer,
 * or any positive line-level offer discount (covers timing before discounts resolve).
 */
export function cartHasPromotionalPricing(cart: CartItem[], cartWithOffers: CartItem[]): boolean {
  if (cart.some((i) => isCartAutoAddedBogoFreeLine(i))) return true;
  if (cartWithOffers.some((i) => i.appliedOffer != null)) return true;
  const disc = cartWithOffers.reduce((s, i) => s + (i.offerDiscount ?? 0) * i.quantity, 0);
  return disc > 0;
}

/** Gross of cart lines the customer pays for (excludes auto-added BOGO free lines). */
export function cartGrossExcludingBogoAutoFree(cart: CartItem[]): number {
  return cart.reduce((sum, item) => {
    if (isCartAutoAddedBogoFreeLine(item)) return sum;
    return sum + item.totalPrice * item.quantity;
  }, 0);
}

/** Offer discount dollars tied to payable lines only (not auto BOGO free lines). */
export function offerDiscountSumExcludingBogoAutoFree(items: CartItem[]): number {
  return items.reduce((sum, item) => {
    if (isCartAutoAddedBogoFreeLine(item)) return sum;
    return sum + (item.offerDiscount ?? 0) * item.quantity;
  }, 0);
}

/** List-price value of app-inserted BOGO free lines (for display only). */
export function cartAutoPromoFreeListValue(cart: CartItem[]): number {
  return cart.reduce((sum, item) => {
    if (!isCartAutoAddedBogoFreeLine(item)) return sum;
    return sum + item.totalPrice * item.quantity;
  }, 0);
}

/** @deprecated Use cartAutoPromoFreeListValue */
export const bogoAutoFreeListValue = cartAutoPromoFreeListValue;
