import React, { useEffect } from 'react';
import { Link } from 'react-router';
import { Instagram } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Location } from '../types';

/** TikTok mark (Lucide has no TikTok icon). */
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48.04 2.96.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  );
}
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M20.52 3.48A11.8 11.8 0 0012.03 0C5.41 0 .02 5.39.02 12.01c0 2.12.55 4.18 1.6 6L0 24l6.17-1.61a11.94 11.94 0 005.86 1.5h.01c6.62 0 12.01-5.39 12.01-12.01 0-3.21-1.25-6.23-3.53-8.4zM12.04 21.4c-1.82 0-3.6-.49-5.16-1.42l-.37-.22-3.66.96.98-3.57-.24-.37a9.3 9.3 0 01-1.45-5.02c0-5.14 4.18-9.32 9.32-9.32 2.49 0 4.83.97 6.6 2.73a9.28 9.28 0 012.72 6.6c0 5.14-4.18 9.32-9.32 9.32zm5.1-6.97c-.28-.14-1.66-.82-1.92-.92-.26-.1-.45-.14-.64.14-.19.28-.73.92-.9 1.1-.17.19-.33.21-.61.07-.28-.14-1.2-.44-2.29-1.41-.85-.76-1.42-1.69-1.59-1.97-.17-.28-.02-.43.13-.57.13-.13.28-.33.42-.49.14-.17.19-.28.28-.47.09-.19.05-.35-.02-.49-.07-.14-.64-1.54-.88-2.1-.23-.55-.47-.47-.64-.48h-.55c-.19 0-.49.07-.75.35-.26.28-1 1-1 2.44s1.03 2.83 1.18 3.02c.14.19 2.03 3.1 4.92 4.35.69.3 1.22.48 1.64.61.69.22 1.31.19 1.8.12.55-.08 1.66-.68 1.9-1.34.24-.66.24-1.23.17-1.34-.07-.1-.26-.17-.54-.31z" />
    </svg>
  );
}

function contactHoursLine(loc: Location): string | null {
  const h = loc.hours?.trim();
  if (h) return h;
  const t = loc.timing?.trim();
  if (t) return t;
  if (loc.opensAt && loc.closesAt) return `${loc.opensAt} – ${loc.closesAt}`;
  return null;
}

export function Footer() {
  const { locations, ensureLocationsPageLoaded } = useApp();

  useEffect(() => {
    void ensureLocationsPageLoaded();
  }, []);

  const primary = locations[0];
  const hoursText = primary ? contactHoursLine(primary) : null;

  return (
    <footer className="bg-gray-900 text-white mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4 text-orange-500">Pizza Offers</h3>
            <p className="text-gray-400 text-sm">
              Bringing you the finest food with the best ingredients since 2021.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link to="/" className="hover:text-orange-500 transition-colors">Home</Link></li>
              <li><Link to="/popularpizza-menu" className="hover:text-orange-500 transition-colors">Menu</Link></li>
              <li><Link to="/popularpizza-offers" className="hover:text-orange-500 transition-colors">Offers</Link></li>
              <li><Link to="/locations" className="hover:text-orange-500 transition-colors">Locations</Link></li>
              <li><Link to="/popularpizza-coupons" className="hover:text-orange-500 transition-colors">Coupons</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            {primary ? (
              <ul className="space-y-2 text-sm text-gray-400">
                {primary.name ? (
                  <li className="font-medium text-gray-300">{primary.name}</li>
                ) : null}
                <li className="whitespace-pre-line">{primary.address}</li>
                {primary.phone?.trim() ? (
                  <li>
                    <a
                      href={`tel:${primary.phone.replace(/[^\d+]/g, '')}`}
                      className="hover:text-orange-500 transition-colors"
                    >
                      {primary.phone}
                    </a>
                  </li>
                ) : null}
                {hoursText ? <li>{hoursText}</li> : null}
                {locations.length > 1 ? (
                  <li>
                    <Link to="/locations" className="hover:text-orange-500 transition-colors">
                      All {locations.length} locations
                    </Link>
                  </li>
                ) : null}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">
                <Link to="/locations" className="hover:text-orange-500 transition-colors">
                  View our locations
                </Link>
              </p>
            )}
          </div>

          <div>
            <h4 className="font-semibold mb-4">Follow Us</h4>
            <div className="flex space-x-4">
              <a href="https://www.tiktok.com/@popular.pizza.2200queen?_r=1&_t=ZS-95QZn7XGL5R" className="hover:text-orange-500 transition-colors" aria-label="TikTok">
                <TikTokIcon className="h-6 w-6" />
              </a>
              <a href="https://www.instagram.com/popular.pizza_queen.torbram?igsh=MTgwbmdmc3JhZW42bA%3D%3D&utm_source=qr" className="hover:text-orange-500 transition-colors" aria-label="Instagram">
                <Instagram className="h-6 w-6" />
              </a>
            </div>
          </div>
        </div>

        {/* <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
          <p>&copy; 2026 Pizza Offers. All rights reserved. Developed By GP: <WhatsAppIcon className="w-2 h-2 text-green-500" />+919646677913 </p>
        </div> */}
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
          <p className="flex items-center justify-center gap-1">
            &copy; 2026 Pizza Offers. All rights reserved. Developed By GP: 
            
            <a
              href="https://wa.me/919646677913"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-orange-500 transition-colors"
              aria-label="Chat on WhatsApp"
            >
              <WhatsAppIcon className="w-4 h-4 text-green-500" />
              +919646677913
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
