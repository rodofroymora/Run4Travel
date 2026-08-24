export type PartnerOffer = {
  id: string;
  placeId: string;
  venueName: string;
  cityId: string;
  discountPct: number;
  code: string;
  perk: string;
  terms: string;
  /** True = demo catalog; not valid at the till. */
  demo: boolean;
};
