import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useApp } from '../context/AppContext';
import { Offer } from '../types';
import { spendGetFreeMenuBadge } from '../lib/spendOfferDisplay';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { Info, UtensilsCrossed } from 'lucide-react';

export function MenuPage() {
  const { menuItems, categories, getActiveOffers, ensureMenuBrowseLoaded } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    void ensureMenuBrowseLoaded();
  }, []);
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);
  const selectedCategoryId = searchParams.get('category') || 'all';

  const filteredItems = selectedCategoryId === 'all' 
    ? menuItems 
    : menuItems.filter(item => item.categoryId === selectedCategoryId);

  const activeOffers = getActiveOffers();

  const getOfferForItem = (itemId: string) => {
    return activeOffers.find((offer) => {
      const kind = offer.offerKind ?? 'standard';
      if (kind === 'spend_get_free') {
        const t = offer.spendRewardType ?? 'free_item';
        if (t === 'free_item') return offer.rewardMenuItemId === itemId;
        // Order-level spend rewards (% / fixed) should only be surfaced at cart level,
        // not as per-item badges in the menu list.
        return false;
      }
      return offer.applicableItemIds.includes(itemId);
    });
  };

  const offerBadgeText = (offer: Offer) => {
    const kind = offer.offerKind ?? 'standard';
    if (kind === 'bogo_same' || kind === 'bogo_any') return 'BOGO';
    if (kind === 'spend_get_free') return spendGetFreeMenuBadge(offer);
    return offer.discountType === 'percentage'
      ? `${offer.discountValue}% off`
      : `$${offer.discountValue} off`;
  };

  const getImageForItem = (itemName: string) => {
    if (itemName.toLowerCase().includes('pizza')) {
      return 'https://images.unsplash.com/photo-1663858835211-3883764dcd52?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwaXp6YSUyMHJlc3RhdXJhbnQlMjBmb29kfGVufDF8fHx8MTc3NDYxNjMxN3ww&ixlib=rb-4.1.0&q=80&w=1080';
    } else if (itemName.toLowerCase().includes('burger')) {
      return 'https://images.unsplash.com/photo-1632898657999-ae6920976661?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXJnZXIlMjBnb3VybWV0JTIwZm9vZHxlbnwxfHx8fDE3NzQ2NDMyODB8MA&ixlib=rb-4.1.0&q=80&w=1080';
    } else if (itemName.toLowerCase().includes('pasta') || itemName.toLowerCase().includes('alfredo')) {
      return 'https://images.unsplash.com/photo-1609166639722-47053ca112ea?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwYXN0YSUyMGl0YWxpYW4lMjBmb29kfGVufDF8fHx8MTc3NDY4NzQzOHww&ixlib=rb-4.1.0&q=80&w=1080';
    } else if (itemName.toLowerCase().includes('salad')) {
      return 'https://images.unsplash.com/photo-1620019989479-d52fcedd99fe?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmVzaCUyMHNhbGFkJTIwYm93bHxlbnwxfHx8fDE3NzQ2ODg1NTN8MA&ixlib=rb-4.1.0&q=80&w=1080';
    }
    return 'https://images.unsplash.com/photo-1596463989140-3b600dab72e5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkcmlua3MlMjBiZXZlcmFnZXMlMjByZXN0YXVyYW50fGVufDF8fHx8MTc3NDY4ODU1M3ww&ixlib=rb-4.1.0&q=80&w=1080';
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Our Menu</h1>

      <Tabs value={selectedCategoryId} onValueChange={(value) => setSearchParams({ category: value })}>
        <div
          className={[
            'md:contents',
            'max-md:sticky max-md:top-16 max-md:z-40',
            'max-md:-mx-4 max-md:border-b max-md:border-gray-200 max-md:bg-white/95 max-md:px-4 max-md:py-2 max-md:shadow-sm max-md:backdrop-blur-sm',
            'max-md:supports-[backdrop-filter]:bg-white/80 max-md:mb-4',
          ].join(' ')}
        >
          <TabsList
            className={[
              'mb-8 md:mb-8 md:w-fit',
              'max-md:mb-0 max-md:h-auto max-md:min-h-9 max-md:w-full max-md:max-w-full',
              'max-md:flex-nowrap max-md:justify-start max-md:overflow-x-auto max-md:rounded-xl',
              'max-md:[&_[data-slot=tabs-trigger]]:shrink-0 max-md:[&_[data-slot=tabs-trigger]]:flex-none',
            ].join(' ')}
          >
            <TabsTrigger value="all">All</TabsTrigger>
            {categories.map((category) => (
              <TabsTrigger key={category.id} value={category.id}>
                {category.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value={selectedCategoryId}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
            {filteredItems.map((item) => {
              const itemOffer = getOfferForItem(item.id);
              const imageSrc = item.image?.trim() ? item.image : getImageForItem(item.name);
              const isFocused = focusedItemId === item.id;

              return (
                <div
                  key={item.id}
                  className={[
                    'relative flex gap-4 rounded-2xl border bg-white p-4 text-left shadow-sm transition-all',
                    'outline-none focus-visible:ring-2 focus-visible:ring-orange-400/80 focus-visible:ring-offset-2',
                    'hover:border-gray-300 hover:shadow-md',
                    isFocused
                      ? 'border-emerald-700 ring-2 ring-emerald-700/30 shadow-sm'
                      : 'border-gray-200',
                    !item.available ? 'opacity-80' : '',
                    'cursor-pointer',
                  ].join(' ')}
                  onClick={() => setFocusedItemId((id) => (id === item.id ? null : item.id))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setFocusedItemId((id) => (id === item.id ? null : item.id));
                    }
                  }}
                  tabIndex={0}
                >
                  <Link
                    to={`/menu/${item.id}`}
                    title="Details"
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`More about ${item.name}`}
                    className={[
                      'absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-lg border shadow-sm transition-colors',
                      isFocused
                        ? 'border-emerald-700 bg-emerald-700 text-white'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
                    ].join(' ')}
                  >
                    <Info className="h-4 w-4" aria-hidden />
                  </Link>

                  <div className="relative shrink-0">
                    <div className="relative flex h-[7.5rem] w-[7.5rem] items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50 sm:h-[8.75rem] sm:w-[8.75rem]">
                      {imageSrc ? (
                        <ImageWithFallback
                          src={imageSrc}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <UtensilsCrossed className="h-10 w-10 text-gray-300" aria-hidden />
                      )}
                      {itemOffer && (
                        <span className="pointer-events-none absolute right-1.5 top-1.5 z-10 max-w-[calc(100%-0.75rem)] truncate rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold uppercase leading-tight tracking-wide text-white shadow-md sm:right-2 sm:top-2">
                          {offerBadgeText(itemOffer)}
                        </span>
                      )}
                      {!item.available && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-black/55">
                          <span className="px-2 text-center text-xs font-semibold text-white">
                            Unavailable
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col justify-between pr-7">
                    <div>
                      <h3 className="font-bold leading-snug text-gray-900">{item.name}</h3>
                      <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-gray-500">
                        {item.description || ' '}
                      </p>
                      {itemOffer && (
                        <p className="mt-1.5 text-xs font-medium text-emerald-700 line-clamp-1">
                          {itemOffer.title}
                        </p>
                      )}
                    </div>
                    <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
                      <span className="text-lg font-bold text-orange-600 tabular-nums sm:text-xl">
                        ${item.basePrice.toFixed(2)}
                      </span>
                      <Link to={`/menu/${item.id}`} onClick={(e) => e.stopPropagation()}>
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
            })}
          </div>

          {filteredItems.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No items found in this category.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}