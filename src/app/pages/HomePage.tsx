import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { useApp } from '../context/AppContext';
import { Offer } from '../types';
import { spendGetFreeSliderBadge } from '../lib/spendOfferDisplay';
import { computeStoreFrontBadges } from '../lib/storeHours';
import { isOfferActiveNow } from '../lib/offerValidity';
import { usePageMeta } from '../hooks/usePageMeta';
import { Clock, MapPin, Phone, ChevronLeft, ChevronRight } from 'lucide-react';

export function HomePage() {
  usePageMeta(
    'Home',
    'Discover Pizza Offers — featured deals on the home slider, store hours, and quick links to order online.',
    'home'
  );

  const { categories, locations, offers, ensureHomePageLoaded } = useApp();
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
  }, []);

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

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section
        className="relative min-h-[520px] bg-cover bg-center"
        style={{
          backgroundImage:
            'url(https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=2000&q=80)',
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
                <Link to="/locations">
                  <Button
                    size="lg"
                    variant="outline"
                    className="text-base px-7 bg-white text-gray-900 hover:bg-gray-100"
                  >
                    Find Location
                  </Button>
                </Link>
              </div>
            </div>
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

      {/* Categories Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12">Our Menu Categories</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {categories.slice(0, 5).map((category) => (
              <Link key={category.id} to={`/popularpizza-menu/category/${toCategorySlug(category.name)}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-6 text-center">
                    <div className="text-4xl mb-4">
                      {category.id === '1' ? '🍕' : 
                       category.id === '2' ? '🍔' : 
                       category.id === '3' ? '🍝' : 
                       category.id === '4' ? '🥗' : '🥤'}
                    </div>
                    <h3 className="font-semibold text-lg">{category.name}</h3>
                    <p className="text-sm text-gray-600 mt-2">{category.description}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link to="/popularpizza-menu">
              <Button variant="outline" size="lg">View Full Menu</Button>
            </Link>
          </div>
        </div>
      </section>

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

      {/* CTA Section */}
      <section className="py-16 bg-orange-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to Order?</h2>
          <p className="text-xl mb-8">Browse our menu and customize your meal</p>
          <Link to="/popularpizza-menu">
            <Button size="lg" variant="secondary" className="text-lg px-8">
              Start Your Order
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
