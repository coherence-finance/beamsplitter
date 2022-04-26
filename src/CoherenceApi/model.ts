export interface UserPrismEtf {
  mint: string;
  symbol: string;
  name: string;
  icon?: string;
  info?: string;
  listingBid: number;
  targetAllocations: {
    mint: string;
    target: number;
    coingeckoInfo: {
      id: string;
      market_data: {
        current_price: { usd: number };
        price_change_24h: number;
        price_change_percentage_24h: number;
      };
    };
  }[];
  highlighted: boolean;
  aum: number;
  supply: number;
}
