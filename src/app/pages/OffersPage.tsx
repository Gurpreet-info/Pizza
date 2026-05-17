import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Offer } from '../types';
import { spendGetFreeRuleSummary } from '../lib/spendOfferDisplay';
import { usePageMeta } from '../hooks/usePageMeta';
import { HomePageBanner } from '../components/HomePageBanner';

export function OffersPage() {
  usePageMeta(
    'Offers',
    'Explore current Pizza Offers promotions — discounts, BOGO deals, and spend-based rewards on menu favourites.',
    'offers'
  );

  const { offers, menuItems, ensureOffersMarketingLoaded } = useApp();

  useEffect(() => {
    void ensureOffersMarketingLoaded();
  }, []);

  const activeOffers = offers.filter(offer => {
    const now = new Date();
    return (
      offer.active &&
      new Date(offer.validFrom) <= now &&
      new Date(offer.validUntil) >= now
    );
  });

  const getApplicableItems = (offer: Offer) => {
    return menuItems.filter((item) => offer.applicableItemIds.includes(item.id));
  };

  const offerMarketingBadge = (offer: Offer) => {
    const kind = offer.offerKind ?? 'standard';
    if (kind === 'bogo_same') return 'Buy 1 get 1 — same item';
    if (kind === 'bogo_any') return 'Buy 1 get 1 — mix items';
    if (kind === 'spend_get_free') return spendGetFreeRuleSummary(offer);
    return offer.discountType === 'percentage'
      ? `${offer.discountValue}% OFF`
      : `$${offer.discountValue.toFixed(2)} OFF`;
  };

  const spendThresholdBlurb = (offer: Offer) => {
    if (offer.offerKind !== 'spend_get_free' || offer.minSpend == null) return null;
    const m = offer.minSpend.toFixed(2);
    const t = offer.spendRewardType ?? 'free_item';
    if (t === 'percent_off') {
      return `Spend at least $${m} on your cart (after other discounts) to get ${offer.spendRewardPercent ?? 0}% off your order.`;
    }
    if (t === 'fixed_amount') {
      return `Spend at least $${m} on your cart (after other discounts) to get $${(offer.spendRewardFixedAmount ?? 0).toFixed(2)} off your order.`;
    }
    return `Add items until your cart (after other discounts) reaches at least $${m} — the reward item below is free if it’s in your cart.`;
  };

  const getDisplayItems = (offer: Offer) => {
    if (offer.offerKind === 'spend_get_free') {
      const t = offer.spendRewardType ?? 'free_item';
      if (t === 'free_item' && offer.rewardMenuItemId) {
        const reward = menuItems.find((m) => m.id === offer.rewardMenuItemId);
        return reward ? [reward] : [];
      }
      return [];
    }
    return getApplicableItems(offer);
  };

  return (
    <div>
      <HomePageBanner
        title="Today’s Special Offers"
        subtitle="Discover fresh discounts, BOGO deals, and spend rewards available right now."
      />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Special Offers</h1>
          <p className="text-gray-600">Check out our amazing deals and save on your favorite items!</p>
        </div>

        {activeOffers.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-gray-100 rounded-full w-24 h-24 mx-auto mb-4 flex items-center justify-center">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Active Offers</h3>
            <p className="text-gray-500">Check back later for amazing deals!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeOffers.map((offer) => {
              const applicableItems = getDisplayItems(offer);
              return (
                <Card key={offer.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  {offer.image && (
                    <div className="w-full h-48 overflow-hidden bg-gray-100">
                      <img
                        src={offer.image}
                        alt={offer.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardContent className="p-6">
                    <div className="mb-3">
                      <Badge className="bg-red-500 text-white mb-2">{offerMarketingBadge(offer)}</Badge>
                      <h3 className="text-xl font-bold mb-2">{offer.title}</h3>
                      <p className="text-gray-600 text-sm mb-3">{offer.description}</p>
                      {offer.offerKind === 'spend_get_free' && offer.minSpend != null ? (
                        <p className="text-sm text-gray-700 mb-2">{spendThresholdBlurb(offer)}</p>
                      ) : null}
                    </div>

                    <div className="border-t pt-4 mt-4">
                      <p className="text-sm font-semibold text-gray-700 mb-2">
                        {offer.offerKind === 'spend_get_free'
                          ? (offer.spendRewardType ?? 'free_item') === 'free_item'
                            ? 'Reward item (free when qualified):'
                            : 'Order-wide deal (no specific item):'
                          : 'Applicable on:'}
                      </p>
                      <div className="space-y-1">
                        {applicableItems.length > 0 ? (
                          applicableItems.map((item) => (
                            <div
                              key={item.id}
                              className="text-sm text-gray-600 flex items-center gap-2"
                            >
                              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              {item.name}
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500 italic">
                            {offer.offerKind === 'spend_get_free' &&
                            (offer.spendRewardType ?? 'free_item') !== 'free_item'
                              ? 'Discount applies to your whole cart when you qualify.'
                              : 'No items selected'}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="border-t pt-4 mt-4">
                      <p className="text-xs text-gray-500">
                        Valid until: {new Date(offer.validUntil).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
