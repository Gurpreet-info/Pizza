import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';

/** Menu listing routes (not item detail). Category tab switches only change this path — do not jump to top. */
function isMenuListingPath(path: string): boolean {
  return path === '/popularpizza-menu' || path.startsWith('/popularpizza-menu/category/');
}

export function ScrollToTop() {
  const { pathname } = useLocation();
  const prevPathnameRef = useRef<string | null>(null);

  useEffect(() => {
    const prev = prevPathnameRef.current;
    prevPathnameRef.current = pathname;

    if (prev !== null && isMenuListingPath(prev) && isMenuListingPath(pathname)) {
      return;
    }
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
