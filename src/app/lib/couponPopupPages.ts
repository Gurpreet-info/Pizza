export const COUPON_POPUP_PAGES = [
  { key: 'home', label: 'Home' },
  { key: 'menu', label: 'Menu' },
  { key: 'cart', label: 'Cart' },
  { key: 'checkout', label: 'Checkout' },
  { key: 'offers', label: 'Offers' },
  { key: 'coupons', label: 'Coupons' },
  { key: 'locations', label: 'Locations' },
  { key: 'about', label: 'About Us' },
  { key: 'privacy', label: 'Privacy Policy' },
] as const;

export type CouponPopupPage = (typeof COUPON_POPUP_PAGES)[number]['key'];

const POPUP_PAGE_KEYS = new Set<string>(COUPON_POPUP_PAGES.map((page) => page.key));

export function readCouponPopupPages(raw: unknown): CouponPopupPage[] {
  let value = raw;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is CouponPopupPage => typeof item === 'string' && POPUP_PAGE_KEYS.has(item));
}

export function couponPopupPageFromPath(pathname: string): CouponPopupPage | null {
  if (pathname === '/') return 'home';
  if (pathname === '/popularpizza-menu' || pathname.startsWith('/popularpizza-menu/')) return 'menu';
  if (pathname === '/cart') return 'cart';
  if (pathname === '/checkout') return 'checkout';
  if (pathname === '/popularpizza-offers' || pathname.startsWith('/popularpizza-offers/')) return 'offers';
  if (pathname === '/popularpizza-coupons') return 'coupons';
  if (pathname === '/locations') return 'locations';
  if (pathname === '/about-us') return 'about';
  if (pathname === '/privacy-policy') return 'privacy';
  return null;
}

export function couponPopupDismissKey(page: CouponPopupPage): string {
  return `coupon-popup-dismissed:${page}`;
}
