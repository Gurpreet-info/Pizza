/** Normalize postal / ZIP for comparison (matches backend DeliveryPostalCode::normalizeCode). */
export function normalizePostalCode(input: string): string {
  return input.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}
