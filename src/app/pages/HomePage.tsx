import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { useApp } from '../context/AppContext';
import { Offer } from '../types';
import { spendGetFreeSliderBadge } from '../lib/spendOfferDisplay';
import { computeStoreFrontBadges } from '../lib/storeHours';
import { isOfferActiveNow } from '../lib/offerValidity';
import { getMenuItemOfferDisplay } from '../lib/bogoOfferMenuBadge';
import { usePageMeta } from '../hooks/usePageMeta';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { Clock, MapPin, Phone, ChevronLeft, ChevronRight, UtensilsCrossed } from 'lucide-react';

export function HomePage() {
  usePageMeta(
    'Home',
    'Discover Pizza Offers — featured deals on the home slider, store hours, and quick links to order online.',
    'home'
  );

  const { categories, locations, offers, menuItems, getActiveOffers, ensureHomePageLoaded, getBannerImage, ensurePageBannersLoaded } = useApp();
  const toCategorySlug = (name: string) =>
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  const [activeSlide, setActiveSlide] = useState(0);
  const [storeClock, setStoreClock] = useState(() => new Date());
  const primaryLocation = locations[0];

  useEffect(() => {
    void ensureHomePageLoaded();
    void ensurePageBannersLoaded();
  }, []);

  const homeHeroImage =
    getBannerImage('home') ||
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=2000&q=80';

  useEffect(() => {
    const id = window.setInterval(() => setStoreClock(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const storeBadges = useMemo(
    () => (primaryLocation ? computeStoreFrontBadges(primaryLocation, storeClock) : null),
    [primaryLocation, storeClock]
  );

  const sliderOffers = useMemo(() => {
    return offers.filter(
      (offer) => offer.showOnSlider && isOfferActiveNow(offer)
    );
  }, [offers]);

  useEffect(() => {
    if (sliderOffers.length <= 1) return;
    const t = window.setInterval(() => {
      setActiveSlide((cur) => (cur + 1) % sliderOffers.length);
    }, 4500);
    return () => window.clearInterval(t);
  }, [sliderOffers.length]);

  useEffect(() => {
    if (activeSlide <= sliderOffers.length - 1) return;
    setActiveSlide(0);
  }, [sliderOffers.length, activeSlide]);

  const nextSlide = () => {
    if (sliderOffers.length <= 1) return;
    setActiveSlide((cur) => (cur + 1) % sliderOffers.length);
  };

  const prevSlide = () => {
    if (sliderOffers.length <= 1) return;
    setActiveSlide((cur) => (cur - 1 + sliderOffers.length) % sliderOffers.length);
  };

  const offerBadgeText = (offer: Offer) => {
    const kind = offer.offerKind ?? 'standard';
    if (kind === 'bogo_same') return 'BUY 1 GET 1';
    if (kind === 'bogo_any') return 'BOGO MIX & MATCH';
    if (kind === 'spend_get_free') return spendGetFreeSliderBadge(offer);
    return offer.discountType === 'percentage'
      ? `${offer.discountValue}% OFF`
      : `$${offer.discountValue.toFixed(2)} OFF`;
  };

  /** Menu items that currently have an active offer (for the deals carousel). */
  const offerItems = useMemo(() => {
    const active = getActiveOffers();
    return menuItems
      .map((item) => ({ item, display: getMenuItemOfferDisplay(item.id, active, menuItems) }))
      .filter(
        (entry): entry is { item: (typeof menuItems)[number]; display: NonNullable<typeof entry.display> } =>
          entry.display !== null
      );
  }, [menuItems, offers, getActiveOffers]);

  const offerItemsScrollRef = useRef<HTMLDivElement>(null);

  const scrollOfferItems = (direction: 1 | -1) => {
    const el = offerItemsScrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth, behavior: 'smooth' });
  };

  /** Categories flagged to show on the home page, in display order. */
  const homeCategories = useMemo(
    () =>
      categories
        .filter((c) => c.showOnHome)
        .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)),
    [categories]
  );

  const categoriesScrollRef = useRef<HTMLDivElement>(null);

  const scrollCategories = (direction: 1 | -1) => {
    const el = categoriesScrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth, behavior: 'smooth' });
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section
        className="relative min-h-[520px] bg-cover bg-center"
        style={{
          backgroundImage: `url(${homeHeroImage})`,
        }}
      >
        <div className="absolute inset-0 bg-black/45" />
        <div className="relative container mx-auto px-4 py-10 md:py-14 min-h-[520px] flex items-center">
          <div className="grid w-full grid-cols-1 gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-10 items-center">
            {/* Left card from primary location */}
            <div className="order-2 lg:order-1">
              {primaryLocation ? (
                <div className="mx-auto w-full max-w-[560px] rounded-2xl border border-white/60 bg-white/95 p-4 shadow-xl backdrop-blur-sm">
                  <div className="flex items-start gap-4">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border bg-gray-100">
                      {primaryLocation.image ? (
                        <img
                          src={primaryLocation.image}
                          alt={primaryLocation.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full grid place-items-center text-gray-400 text-xs font-semibold">
                          LOGO
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-2xl font-bold text-gray-900">{primaryLocation.name}</h3>
                      <div className="mt-2 space-y-1.5 text-sm text-gray-700">
                        <p className="flex items-start gap-2">
                          <MapPin className="mt-0.5 h-4 w-4 text-orange-600 shrink-0" />
                          <span>{primaryLocation.address}</span>
                        </p>
                        <p className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-orange-600 shrink-0" />
                          <span>{primaryLocation.phone}</span>
                        </p>
                        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-2">
                          <Clock className="h-4 w-4 text-orange-600 shrink-0" />
                          <span>{primaryLocation.hours || primaryLocation.timing || 'Hours not set'}</span>
                          {storeBadges?.showClosed ? (
                            <span className="inline-flex rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white">
                              Store is closed
                            </span>
                          ) : null}
                          {storeBadges?.showOpen ? (
                            <span className="inline-flex rounded-full bg-green-600 px-3 py-1 text-xs font-semibold text-white">
                              Store is open
                            </span>
                          ) : null}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mx-auto w-full max-w-[560px] rounded-2xl border border-white/60 bg-white/95 p-5 shadow-xl backdrop-blur-sm">
                  <p className="text-sm text-gray-700">Add at least one location in admin to show the store card here.</p>
                </div>
              )}
            </div>

            {/* Right hero copy */}
            <div className="order-1 lg:order-2 text-white text-center lg:text-left">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
                Delicious Food, Delivered Fast
              </h1>
              <p className="mt-4 text-lg sm:text-xl text-white/95 max-w-xl mx-auto lg:mx-0">
                Order your favorite meals online with customizable options
              </p>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                <Link to="/popularpizza-menu">
                  <Button size="lg" className="bg-orange-600 hover:bg-orange-700 text-base px-7">
                    Order Now
                  </Button>
                </Link>
                               
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="text-base px-7 bg-white text-gray-900 hover:bg-gray-100"
                >
                  <a href="tel:+14165550100">
                    <Phone className="h-4 w-4 mr-2" />
                    Call Us
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Items On Offer Carousel */}
      {offerItems.length > 0 ? (
        <section className="py-10 md:py-12 bg-white">
          <div className="container mx-auto px-4">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Deals on Your Favorites</h2>
                <p className="text-sm md:text-base text-gray-600">
                  Grab these items while the offer lasts.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link to="/popularpizza-menu" className="shrink-0">
                  <Button variant="outline" size="sm" className="md:size-default">View Menu</Button>
                </Link>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => scrollOfferItems(-1)}
                    className="rounded-full border border-gray-200 bg-white p-2 text-gray-700 shadow-sm transition hover:bg-gray-50 active:scale-95"
                    aria-label="Previous items"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollOfferItems(1)}
                    className="rounded-full border border-gray-200 bg-white p-2 text-gray-700 shadow-sm transition hover:bg-gray-50 active:scale-95"
                    aria-label="Next items"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            <div
              ref={offerItemsScrollRef}
              className="-mx-2 flex touch-pan-x snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth pb-2 [&::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
            >
              {offerItems.map(({ item, display }) => (
                <div
                  key={item.id}
                  className="w-full shrink-0 snap-start px-2 sm:w-1/2 lg:w-1/4"
                >
                  <Link
                    to={`/popularpizza-menu/item/${item.id}`}
                    className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md"
                  >
                    <div className="relative h-44 w-full overflow-hidden bg-gray-50 sm:h-48">
                      {item.image?.trim() ? (
                        <ImageWithFallback
                          src={item.image}
                          alt={item.name}
                          draggable={false}
                          className="pointer-events-none h-full w-full select-none object-cover transition duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <UtensilsCrossed className="h-10 w-10 text-gray-300" aria-hidden />
                        </div>
                      )}
                      <span className="absolute left-3 top-3 max-w-[calc(100%-1.5rem)] truncate rounded-full bg-red-500 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white shadow">
                        {display.badgeText}
                      </span>
                      {!item.available ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                          <span className="text-sm font-semibold text-white">Unavailable</span>
                        </div>
                      ) : null}
                    </div>
                    <div className="flex flex-1 flex-col p-4">
                      <h3 className="truncate font-bold text-gray-900">{item.name}</h3>
                      <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                        {item.description || ' '}
                      </p>
                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-lg font-bold text-orange-600 tabular-nums">
                          ${item.basePrice.toFixed(2)}
                        </span>
                        <span className="inline-flex items-center rounded-lg border-2 border-emerald-600 bg-white px-4 py-1.5 text-sm font-semibold text-emerald-700 transition group-hover:bg-emerald-50">
                          {item.available ? 'Order' : 'View'}
                        </span>
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Categories Section */}
      {homeCategories.length > 0 ? (
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="mb-8 flex items-end justify-between gap-4">
              <h2 className="text-3xl md:text-4xl font-bold">Our Menu Categories</h2>
              {homeCategories.length > 1 ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => scrollCategories(-1)}
                    className="rounded-full border border-gray-200 bg-white p-2 text-gray-700 shadow-sm transition hover:bg-gray-50 active:scale-95"
                    aria-label="Previous categories"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollCategories(1)}
                    className="rounded-full border border-gray-200 bg-white p-2 text-gray-700 shadow-sm transition hover:bg-gray-50 active:scale-95"
                    aria-label="Next categories"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              ) : null}
            </div>

            <div
              ref={categoriesScrollRef}
              className="-mx-2 flex touch-pan-x snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth pb-2 [&::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
            >
              {homeCategories.map((category) => (
                <div
                  key={category.id}
                  className="w-full shrink-0 snap-start px-2 sm:w-1/2 lg:w-1/4"
                >
                  <Link to={`/popularpizza-menu/category/${toCategorySlug(category.name)}`}>
                    <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                      <CardContent className="p-6 text-center">
                        {category.image?.trim() ? (
                          <div className="mx-auto mb-4 h-20 w-20 overflow-hidden rounded-full border border-gray-200 bg-gray-50">
                            <ImageWithFallback
                              src={category.image}
                              alt={category.name}
                              draggable={false}
                              className="pointer-events-none h-full w-full select-none object-cover"
                            />
                          </div>
                        ) : (
                          <div className="text-4xl mb-4">
                            {category.id === '1' ? '🍕' :
                             category.id === '2' ? '🍕🍗' :
                             category.id === '3' ? '🥪' :
                             category.id === '4' ? '🍕🥤🥣' : 
                             category.id === '5' ? '🍟' : 
                             category.id === '7' ? '👨‍👩‍👧‍👦' : 
                             category.id === '8' ? '💎' : 
                             category.id === '9' ? '🥤' : 
                             category.id === '10' ? '🥣' : '🥗'}

                          </div>
                        )}
                        <h3 className="font-semibold text-lg">{category.name}</h3>
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">{category.description}</p>
                      </CardContent>
                    </Card>
                  </Link>
                </div>
              ))}
            </div>

            <div className="text-center mt-8">
              <Link to="/popularpizza-menu">
                <Button variant="outline" size="lg">View Full Menu</Button>
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {/* Features Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card>
              <CardContent className="p-8 text-center">
                <Clock className="h-12 w-12 mx-auto mb-4 text-orange-600" />
                <h3 className="text-xl font-semibold mb-2">Fast Delivery</h3>
                <p className="text-gray-600">Get your order delivered in 30 minutes or less</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-8 text-center">
                <MapPin className="h-12 w-12 mx-auto mb-4 text-orange-600" />
                <h3 className="text-xl font-semibold mb-2">Multiple Locations</h3>
                <p className="text-gray-600">Find us at {locations.length} convenient locations</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-8 text-center">
                <Phone className="h-12 w-12 mx-auto mb-4 text-orange-600" />
                <h3 className="text-xl font-semibold mb-2">Easy Ordering</h3>
                <p className="text-gray-600">Order online or call us for pickup and delivery</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Offers Slider Section */}
      {sliderOffers.length > 0 ? (
        <section className="py-8 md:py-10 bg-gradient-to-b from-orange-50 to-white">
          <div className="container mx-auto px-4">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Today&apos;s Offers</h2>
                <p className="text-sm md:text-base text-gray-600">Limited-time deals curated by our team.</p>
              </div>
              <Link to="/popularpizza-offers" className="shrink-0">
                <Button variant="outline" size="sm" className="md:size-default">View All Offers</Button>
              </Link>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm">
              <div
                className="flex transition-transform duration-500 ease-out"
                style={{ transform: `translateX(-${activeSlide * 100}%)` }}
              >
                {sliderOffers.map((offer) => (
                  <div key={offer.id} className="min-w-full">
                    <div className="grid grid-cols-1 md:grid-cols-2">
                      <div className="relative h-52 sm:h-64 md:h-72">
                        <img
                          src={offer.image}
                          alt={offer.title}
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute left-3 top-3 rounded-full bg-red-500 px-3 py-1 text-xs font-bold tracking-wide text-white shadow">
                          {offerBadgeText(offer)}
                        </div>
                      </div>
                      <div className="flex flex-col justify-center p-5 sm:p-6 md:p-8">
                        <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">{offer.title}</h3>
                        <p className="mt-2 text-sm sm:text-base text-gray-600 line-clamp-3">{offer.description}</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Link to="/popularpizza-offers">
                            <Button className="bg-orange-600 hover:bg-orange-700">See Details</Button>
                          </Link>
                          <Link to="/popularpizza-menu">
                            <Button variant="outline">Order Now</Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {sliderOffers.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={prevSlide}
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-gray-700 shadow hover:bg-white md:left-3"
                    aria-label="Previous offer"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={nextSlide}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-gray-700 shadow hover:bg-white md:right-3"
                    aria-label="Next offer"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
                    {sliderOffers.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveSlide(idx)}
                        aria-label={`Go to offer ${idx + 1}`}
                        className={`h-2.5 w-2.5 rounded-full transition ${
                          idx === activeSlide ? 'bg-orange-600 w-6' : 'bg-white/80'
                        }`}
                      />
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {/* CTA Section */}
      <section className="py-16 bg-orange-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to Order?</h2>
          <p className="text-xl mb-8">Browse our menu and customize your meal</p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3 lg:justify-center">
            <Link to="/popularpizza-menu">
              <Button size="lg" variant="secondary" className="text-lg px-8">
                Start Your Order
              </Button>
            </Link>
            <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="text-base px-7 bg-white text-gray-900 hover:bg-gray-100"
                >
                  <a href="tel:+14165550100">
                    <Phone className="h-4 w-4 mr-2" />
                    Call Us
                  </a>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
