import { Connection } from "@solana/web3.js";

export const MAINNET_CONNECTION = new Connection(
  "https://api.mainnet-beta.solana.com"
);

// TODO: Support use of `expo` in here when it gets implemented in `utils.rs`
/*export const getWeightedTokensValue = (weightedTokens: WeightedToken[]) => {
  return weightedTokens.reduce((acc, { mint, weight }) => {

    return acc + price.mul(weight).toNumber();
  }, 0);
};*/

/*export const getToAmount = (
  fromWeightedTokens: WeightedToken[],
  toWeightedTokens: WeightedToken[],
  fromAmount: number
) => {
  const fromValue = getPrismEtfValue(fromWeightedTokens);
  const toValue = getPrismEtfValue(toWeightedTokens);

  const effectiveValue = fromAmount * fromValue;
  return Math.floor(effectiveValue / toValue);
};
*/
