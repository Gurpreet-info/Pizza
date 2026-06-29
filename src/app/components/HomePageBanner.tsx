import React, { useEffect } from 'react';
import { Link } from 'react-router';
import { Button } from './ui/button';
import { Phone } from 'lucide-react';
import { useApp } from '../context/AppContext';

const DEFAULT_BANNER_IMAGE =
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=2000&q=80';

type HomePageBannerProps = {
  title: string;
  subtitle: string;
  /** Page key used to load the admin-managed banner image (e.g. 'menu', 'offers', 'coupons'). */
  pageKey?: string;
  /** Fallback background image when no admin banner is set for the page. */
  backgroundImage?: string;
};

export function HomePageBanner({ title, subtitle, pageKey, backgroundImage }: HomePageBannerProps) {
  const { getBannerImage, ensurePageBannersLoaded } = useApp();

  useEffect(() => {
    void ensurePageBannersLoaded();
  }, []);

  const adminImage = pageKey ? getBannerImage(pageKey) : undefined;
  const resolvedImage = adminImage || backgroundImage || DEFAULT_BANNER_IMAGE;

  return (
    <section
      className="relative min-h-[340px] bg-cover bg-center"
      style={{
        backgroundImage: `url(${resolvedImage})`,
      }}
    >
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative container mx-auto px-4 py-14 min-h-[340px] flex items-center">
        <div className="w-full text-white text-center">
          <h1 className="text-4xl sm:text-5xl font-bold leading-tight">{title}</h1>
          <p className="mt-4 text-lg sm:text-xl text-white/95 max-w-2xl mx-auto">{subtitle}</p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            
              
              <Button
                  asChild
                  size="lg"
                  className="bg-orange-600 hover:bg-orange-700 text-base px-7"
                >
                  <a href="tel:+14165550100">
                    <Phone className="h-4 w-4 " />
                    Call Us
                  </a>
                </Button>
            
            {/* <Link to="/locations">
              <Button
                size="lg"
                variant="outline"
                className="text-base px-7 bg-white text-gray-900 hover:bg-gray-100"
              >
                Find Location
              </Button>
            </Link> */}
          </div>
        </div>
      </div>
    </section>
  );
}
