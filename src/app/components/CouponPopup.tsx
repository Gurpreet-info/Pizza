import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { Check, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../context/AppContext';
import { Coupon } from '../types';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';
import {
  couponPopupDismissKey,
  couponPopupPageFromPath,
  CouponPopupPage,
} from '../lib/couponPopupPages';

/** Milliseconds to wait after the loading screen closes. 10000 = 10 seconds. */
const COUPON_POPUP_DELAY_MS = 10000;

function isPopupCouponValid(coupon: Coupon, now: Date): boolean {
  return (
    coupon.active &&
    new Date(coupon.validUntil) >= now &&
    new Date(coupon.validFrom) <= now &&
    coupon.usageCount < coupon.usageLimit
  );
}

function pickPopupCoupon(coupons: Coupon[], page: CouponPopupPage, now: Date): Coupon | null {
  const matches = coupons.filter(
    (coupon) => (coupon.popupPages ?? []).includes(page) && isPopupCouponValid(coupon, now)
  );
  if (matches.length === 0) return null;
  matches.sort((a, b) => {
    const end = new Date(a.validUntil).getTime() - new Date(b.validUntil).getTime();
    if (end !== 0) return end;
    return Number(a.id) - Number(b.id);
  });
  return matches[0];
}

function isDismissed(page: CouponPopupPage): boolean {
  try {
    return sessionStorage.getItem(couponPopupDismissKey(page)) === '1';
  } catch {
    return false;
  }
}

function rememberDismissed(page: CouponPopupPage) {
  try {
    sessionStorage.setItem(couponPopupDismissKey(page), '1');
  } catch {
    /* private browsing can block storage; the popup still closes */
  }
}

function discountLabel(coupon: Coupon): string {
  if (coupon.discountType === 'percentage') {
    return `${coupon.discountValue}% OFF`;
  }
  return `$${coupon.discountValue.toFixed(2)} OFF`;
}

function formatUntil(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function CouponPopup() {
  const { pathname } = useLocation();
  const { coupons, ensureCouponsPageLoaded, showLoadingOverlay } = useApp();
  const page = couponPopupPageFromPath(pathname);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const openedFor = useRef<CouponPopupPage | null>(null);

  useEffect(() => {
    if (!page || isDismissed(page)) return;
    void ensureCouponsPageLoaded().catch(() => {});
  }, [page]);

  const coupon = useMemo(() => {
    if (!page) return null;
    return pickPopupCoupon(coupons, page, new Date());
  }, [coupons, page]);

  useEffect(() => {
    if (!page || !coupon || isDismissed(page)) {
      openedFor.current = null;
      setOpen(false);
      return;
    }
    if (openedFor.current && openedFor.current !== page) {
      openedFor.current = null;
      setOpen(false);
    }
    if (showLoadingOverlay) return;
    if (openedFor.current === page) return;
    const timer = window.setTimeout(() => {
      if (isDismissed(page)) return;
      openedFor.current = page;
      setCopied(false);
      setOpen(true);
    }, COUPON_POPUP_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [page, coupon, showLoadingOverlay]);

  const dismiss = () => {
    const target = openedFor.current;
    if (target) rememberDismissed(target);
    openedFor.current = null;
    setOpen(false);
  };

  const copyCode = async () => {
    if (!coupon) return;
    try {
      await navigator.clipboard.writeText(coupon.code);
      setCopied(true);
      toast.success(`Coupon code "${coupon.code}" copied to clipboard!`);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy the coupon code');
    }
  };

  if (!coupon) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) dismiss();
      }}
    >
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogTitle className="sr-only">Coupon {coupon.code}</DialogTitle>
        <DialogDescription className="sr-only">{coupon.description}</DialogDescription>
        <div className="flex flex-col sm:flex-row">
          <div className="flex flex-col items-center justify-center bg-orange-600 px-6 py-8 text-white sm:w-40 sm:border-r sm:border-dashed sm:border-white/70">
            <div className="text-3xl font-bold leading-none">{discountLabel(coupon)}</div>
            <div className="mt-2 text-xs font-semibold tracking-wide">COUPON</div>
          </div>
          <div className="border-t border-dashed border-orange-200 px-5 py-5 sm:border-t-0 sm:pr-12">
            <div className="text-xs uppercase tracking-wide text-gray-500">Today&apos;s deal</div>
            <div className="mt-1 text-lg font-bold text-gray-900">{coupon.description}</div>
            <div className="mt-4 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-3">
              <div className="text-xs uppercase text-gray-500">Coupon code</div>
              <div className="font-mono text-2xl font-bold text-orange-600">{coupon.code}</div>
            </div>
            <div className="mt-3 space-y-1 text-sm text-gray-600">
              <div>Minimum order ${coupon.minOrderAmount.toFixed(2)}</div>
              <div>Valid until {formatUntil(coupon.validUntil)}</div>
            </div>
            <Button type="button" className="mt-4 w-full bg-orange-600 hover:bg-orange-700 sm:w-auto" onClick={() => void copyCode()}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied' : 'Copy code'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
