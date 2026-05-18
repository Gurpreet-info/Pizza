import { Offer } from '../types';

/** Laravel / JSON may send 0/1, "true", etc. */
export function coerceOfferActive(raw: unknown): boolean {
  if (raw === true || raw === 1 || raw === '1') return true;
  if (raw === false || raw === 0 || raw === '0') return false;
  return Boolean(raw);
}

/** Inclusive start of the calendar day (local) for valid-from. */
export function parseOfferValidFrom(raw: unknown): Date {
  if (raw == null || raw === '') return new Date(NaN);
  const s = String(raw);
  const dateOnly = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateOnly && !s.includes('T')) {
    return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]), 0, 0, 0, 0);
  }
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return d;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

/** Inclusive end of the calendar day (local) for valid-until. */
export function parseOfferValidUntil(raw: unknown): Date {
  if (raw == null || raw === '') return new Date(NaN);
  const s = String(raw);
  const dateOnly = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateOnly) {
    return new Date(
      Number(dateOnly[1]),
      Number(dateOnly[2]) - 1,
      Number(dateOnly[3]),
      23,
      59,
      59,
      999
    );
  }
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return d;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

/** Build dates from admin date inputs (YYYY-MM-DD). */
export function offerDatesFromFormFields(validFrom: string, validUntil: string): {
  validFrom: Date;
  validUntil: Date;
} {
  return {
    validFrom: parseOfferValidFrom(validFrom),
    validUntil: parseOfferValidUntil(validUntil),
  };
}

export function isOfferActiveNow(
  offer: Pick<Offer, 'active' | 'validFrom' | 'validUntil'>,
  now: Date = new Date()
): boolean {
  if (!offer.active) return false;
  const from =
    offer.validFrom instanceof Date ? offer.validFrom : parseOfferValidFrom(offer.validFrom);
  const until =
    offer.validUntil instanceof Date ? offer.validUntil : parseOfferValidUntil(offer.validUntil);
  if (Number.isNaN(from.getTime()) || Number.isNaN(until.getTime())) return false;
  return from.getTime() <= now.getTime() && until.getTime() >= now.getTime();
}
