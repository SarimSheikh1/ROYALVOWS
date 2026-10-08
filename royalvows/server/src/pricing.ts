export class PricingError extends Error {
  status = 400;
}
export function price(
  venue: { rental: number; capacity: number; taxBps: number },
  pack: {
    perHead: number;
    decor: number;
    minGuests: number;
    maxGuests: number;
    name: string;
  },
  guests: number,
  extras: { addons?: number; discount?: number; menuPerHead?: number } = {},
) {
  if (
    !Number.isInteger(guests) ||
    guests < pack.minGuests ||
    guests > Math.min(venue.capacity, pack.maxGuests)
  )
    throw new PricingError("Guest count outside venue or collection limits");
  const rate = extras.menuPerHead ?? pack.perHead,
    addons = extras.addons || 0,
    discount = extras.discount || 0;
  for (const n of [
    venue.rental,
    pack.decor,
    rate,
    addons,
    discount,
    venue.taxBps,
  ])
    if (!Number.isSafeInteger(n) || n < 0)
      throw new PricingError("Invalid catalog rate");
  if (venue.taxBps > 10000) throw new PricingError("Invalid tax rate");
  const catering = guests * rate;
  const subtotal = venue.rental + catering + pack.decor + addons;
  if (discount > subtotal) throw new PricingError("Discount exceeds subtotal");
  const tax = Math.round(((subtotal - discount) * venue.taxBps) / 10000);
  if (!Number.isSafeInteger(subtotal - discount + tax))
    throw new PricingError("Invalid estimate");
  return {
    collection: pack.name,
    rental: venue.rental,
    catering,
    decor: pack.decor,
    addons,
    discount,
    tax,
    total: subtotal - discount + tax,
    guests,
    perHead: rate,
  };
}
export const transitions: Record<string, string[]> = {
  Pending: ["Awaiting Advance", "Cancelled"],
  "Awaiting Advance": ["Confirmed", "Cancelled"],
  Confirmed: ["In Progress", "Cancelled"],
  "In Progress": ["Completed"],
  Completed: [],
  Cancelled: [],
};
