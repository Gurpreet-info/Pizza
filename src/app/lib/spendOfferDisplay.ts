import type { Offer, SpendRewardType } from '../types';

/** Short badge / table text for spend_get_free (marketing + admin). */
export function spendGetFreeRuleSummary(offer: Offer): string {
  const m = offer.minSpend != null ? offer.minSpend.toFixed(2) : '—';
  const t: SpendRewardType = offer.spendRewardType ?? 'free_item';
  if (t === 'percent_off') {
    const p = offer.spendRewardPercent ?? 0;
    return `Spend $${m}+ → ${p}% off order`;
  }
  if (t === 'fixed_amount') {
    const f = offer.spendRewardFixedAmount ?? 0;
    return `Spend $${m}+ → $${f.toFixed(2)} off order`;
  }
  return `Spend $${m}+ → free reward item`;
}

export function spendGetFreeSliderBadge(offer: Offer): string {
  const m = offer.minSpend != null ? offer.minSpend.toFixed(0) : '?';
  const t: SpendRewardType = offer.spendRewardType ?? 'free_item';
  if (t === 'percent_off') {
    return `${offer.spendRewardPercent ?? 0}% OFF $${m}+`;
  }
  if (t === 'fixed_amount') {
    return `$${(offer.spendRewardFixedAmount ?? 0).toFixed(0)} OFF $${m}+`;
  }
  return `FREE ITEM $${m}+`;
}

export function spendGetFreeMenuBadge(offer: Offer): string {
  const m = offer.minSpend != null ? offer.minSpend.toFixed(0) : '?';
  const t: SpendRewardType = offer.spendRewardType ?? 'free_item';
  if (t === 'percent_off') return `${offer.spendRewardPercent ?? 0}% $${m}+`;
  if (t === 'fixed_amount') return `$${(offer.spendRewardFixedAmount ?? 0).toFixed(0)} $${m}+`;
  return `FREE $${m}+`;
}
