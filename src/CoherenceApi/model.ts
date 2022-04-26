export interface UserPrismEtf {
  mint: string;
  symbol: string;
  name: string;
  icon?: string;
  info?: string;
  listingBid: number;
  targetAllocations: { mint: string; target: number }[];
  highlighted: boolean;
}
