import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useApp } from '../context/AppContext';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { usePageMeta } from '../hooks/usePageMeta';
import { isOfferActiveNow } from '../lib/offerValidity';
import { spendGetFreeRuleSummary } from '../lib/spendOfferDisplay';
import type { MenuItem, Offer } from '../types';
import { UtensilsCrossed } from 'lucide-react';

function offerMarketingBadge(offer: Offer) {
  const kind = offer.offerKind ?? 'standard';
  if (kind === 'bogo_same') return 'Buy 1 get 1 — same item';
  if (kind === 'bogo_any') return 'Buy 1 get 1 — mix items';
  if (kind === 'spend_get_free') return spendGetFreeRuleSummary(offer);
  return offer.discountType === 'percentage'
    ? `${offer.discountValue}% OFF`
    : `$${offer.discountValue.toFixed(2)} OFF`;
}

function OfferMenuItemCard({ item }: { item: MenuItem }) {
  return (
    <div
      className={[
        'relative flex gap-4 rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm',
        !item.available ? 'opacity-80' : '',
      ].join(' ')}
    >
      <div className="relative flex h-[7.5rem] w-[7.5rem] shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50 sm:h-[8.75rem] sm:w-[8.75rem]">
        {item.image?.trim() ? (
          <ImageWithFallback src={item.image} alt={item.name} className="h-full w-full object-cover" />
        ) : (
          <UtensilsCrossed className="h-10 w-10 text-gray-300" aria-hidden />
        )}
        {!item.available ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/55">
            <span className="px-2 text-center text-xs font-semibold text-white">Unavailable</span>
          </div>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div>
          <h3 className="font-bold leading-snug text-gray-900">{item.name}</h3>
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-gray-500">{item.description || ' '}</p>
        </div>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <span className="text-lg font-bold text-orange-600 tabular-nums sm:text-xl">
            ${item.basePrice.toFixed(2)}
          </span>
          <Link to={`/popularpizza-menu/item/${item.id}`}>
            <Button
              variant="outline"
              size="sm"
              disabled={!item.available}
              className="border-2 border-emerald-600 bg-white px-5 font-semibold tracking-wide text-emerald-700 shadow-none hover:bg-emerald-50 hover:text-emerald-800"
            >
              {item.available ? 'ADD' : 'Unavailable'}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export function OfferDetailPage() {
  const { offerId } = useParams();
  const { offers, menuItems, ensureOffersMarketingLoaded } = useApp();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    void ensureOffersMarketingLoaded().finally(() => {
      if (active) setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const offer = useMemo(
    () => offers.find((row) => row.id === offerId) ?? null,
    [offers, offerId]
  );

  usePageMeta(
    offer ? offer.title : 'Offer',
    offer?.description || 'See the menu items included in this Pizza Offers promotion.'
  );

  const paidItems = useMemo(() => {
    if (!offer) return [];
    return menuItems.filter((item) => offer.applicableItemIds.includes(item.id));
  }, [offer, menuItems]);

  const freeItems = useMemo(() => {
    if (!offer || offer.offerKind !== 'bogo_any') return [];
    const ids = offer.bogoFreeItemIds ?? [];
    return menuItems.filter((item) => ids.includes(item.id));
  }, [offer, menuItems]);

  const rewardItem = useMemo(() => {
    if (!offer || offer.offerKind !== 'spend_get_free') return null;
    if ((offer.spendRewardType ?? 'free_item') !== 'free_item' || !offer.rewardMenuItemId) return null;
    return menuItems.find((item) => item.id === offer.rewardMenuItemId) ?? null;
  }, [offer, menuItems]);

  if (!ready) {
    return (
      <div className="container mx-auto px-4 py-16 text-center text-gray-600">Loading offer…</div>
    );
  }

  if (!offer) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Offer not found</h1>
        <p className="mt-2 text-gray-600">This offer is no longer available.</p>
        <Link to="/popularpizza-offers" className="mt-6 inline-block">
          <Button variant="outline">Back to offers</Button>
        </Link>
      </div>
    );
  }

  const active = isOfferActiveNow(offer);
  const cartWideSpend =
    offer.offerKind === 'spend_get_free' && (offer.spendRewardType ?? 'free_item') !== 'free_item';

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <Link to="/popularpizza-offers" className="text-sm font-medium text-orange-600 hover:text-orange-700">
          ← All offers
        </Link>

        <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {offer.image ? (
            <div className="h-56 w-full overflow-hidden bg-gray-100 sm:h-72">
              <img src={offer.image} alt={offer.title} className="h-full w-full object-cover" />
            </div>
          ) : null}
          <div className="p-6">
            <Badge className="bg-red-500 text-white">{offerMarketingBadge(offer)}</Badge>
            <h1 className="mt-3 text-3xl font-bold text-gray-900">{offer.title}</h1>
            <p className="mt-2 text-gray-600">{offer.description}</p>
            {!active ? (
              <p className="mt-3 text-sm font-medium text-red-600">This offer is not active right now.</p>
            ) : null}
            <p className="mt-3 text-xs text-gray-500">
              Valid until:{' '}
              {new Date(offer.validUntil).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>

        {offer.offerKind === 'bogo_any' ? (
          <div className="mt-8 space-y-8">
            <section>
              <h2 className="mb-4 text-2xl font-bold text-gray-900">Buy these items</h2>
              <ItemGrid items={paidItems} empty="No items selected" />
            </section>
            <section>
              <h2 className="mb-4 text-2xl font-bold text-gray-900">Free with this offer</h2>
              <ItemGrid items={freeItems} empty="No free items selected" />
            </section>
          </div>
        ) : offer.offerKind === 'spend_get_free' ? (
          <section className="mt-8">
            <h2 className="mb-4 text-2xl font-bold text-gray-900">
              {cartWideSpend ? 'This offer' : 'Reward item'}
            </h2>
            {cartWideSpend ? (
              <p className="text-gray-600">{offerMarketingBadge(offer)}. The discount applies to your whole cart when you qualify.</p>
            ) : rewardItem ? (
              <ItemGrid items={[rewardItem]} empty="No reward item selected" />
            ) : (
              <p className="text-sm text-gray-500 italic">No items selected</p>
            )}
          </section>
        ) : (
          <section className="mt-8">
            <h2 className="mb-4 text-2xl font-bold text-gray-900">Menu in this offer</h2>
            <ItemGrid items={paidItems} empty="No items selected" />
          </section>
        )}
      </div>
    </div>
  );
}

function ItemGrid({ items, empty }: { items: MenuItem[]; empty: string }) {
  if (items.length === 0) {
    return <p className="text-sm italic text-gray-500">{empty}</p>;
  }
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {items.map((item) => (
        <OfferMenuItemCard key={item.id} item={item} />
      ))}
    </div>
  );
}
