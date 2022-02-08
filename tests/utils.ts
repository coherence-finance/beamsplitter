import type { AssetData } from "../src";

// TODO: Support use of `expo` in here when it gets implemented in `utils.rs`
export const getTokenValue = (assets: AssetData[]) => {
  return assets.reduce(
    (
      acc,
      {
        dataFeed: {
          constant: { price },
        },
        weight,
      }
    ) => {
      return acc + price.mul(weight).toNumber();
    },
    0
  );
};

export const getToAmount = (
  fromAssets: AssetData[],
  toAssets: AssetData[],
  fromAmount: number
) => {
  const fromValue = getTokenValue(fromAssets);
  const toValue = getTokenValue(toAssets);

  const effectiveValue = fromAmount * fromValue;
  return Math.floor(effectiveValue / toValue);
};
