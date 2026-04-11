import type { Location, StoreStatusMode } from '../types';

function normalizeMode(s: unknown): StoreStatusMode {
  if (s === 'force_open' || s === 'force_closed') return s;
  return 'auto';
}

function parseMinutes(s: string | null | undefined): number | null {
  if (!s || typeof s !== 'string') return null;
  const m = s.trim().match(/^([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h * 60 + min;
}

/** Whether the store is currently in its scheduled "open" window (ignores force overrides). */
export function isWithinScheduledHours(location: Pick<Location, 'opensAt' | 'closesAt'>, now: Date = new Date()): boolean {
  const openM = parseMinutes(location.opensAt);
  const closeM = parseMinutes(location.closesAt);
  if (openM === null || closeM === null) return true;

  const cur = now.getHours() * 60 + now.getMinutes();

  if (closeM > openM) {
    return cur >= openM && cur < closeM;
  }
  if (closeM < openM) {
    return cur >= openM || cur < closeM;
  }
  return false;
}

export type StoreFrontBadges = { showClosed: boolean; showOpen: boolean };

/**
 * Home banner badges: automatic mode uses opensAt/closesAt; missing times = no schedule (no closed badge).
 * force_closed / force_open override schedule.
 */
export function computeStoreFrontBadges(location: Location, now: Date = new Date()): StoreFrontBadges {
  const mode = normalizeMode(location.storeStatusMode);

  if (mode === 'force_closed') {
    return { showClosed: true, showOpen: false };
  }
  if (mode === 'force_open') {
    return { showClosed: false, showOpen: true };
  }

  const openM = parseMinutes(location.opensAt);
  const closeM = parseMinutes(location.closesAt);
  if (openM === null || closeM === null) {
    return { showClosed: false, showOpen: false };
  }

  const isOpen = isWithinScheduledHours(location, now);
  return { showClosed: !isOpen, showOpen: false };
}
