export interface JupiterRoute {
  inAmount: number;
  outAmount: number;
  outAmountWithSlippage: number;
  priceImpactPct: number;
  marketInfos: JupiterMarketInfo[];
}

export interface JupiterMarketInfo {
  id: string;
  label: string;
  inputMint: string;
  outputMint: string;
  notEnoughLiquidity: true;
  inAmount: number;
  outAmount: number;
  minInAmount?: number;
  minOutAmount?: number;
  priceImpactPct: number;
  lpFee: {
    amount: number;
    mint: string;
    pct: number;
  };
  platformFee: {
    amount: number;
    mint: string;
    pct: number;
  };
}
