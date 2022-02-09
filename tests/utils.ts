import type { AssetSource } from "../src";

// TODO: Support use of `expo` in here when it gets implemented in `utils.rs`
export const getTokenValue = (assets: AssetSource[]) => {
  return assets.reduce(
    (
      acc,
      {
        dataSource: {
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
  fromAssets: AssetSource[],
  toAssets: AssetSource[],
  fromAmount: number
) => {
  const fromValue = getTokenValue(fromAssets);
  const toValue = getTokenValue(toAssets);

  const effectiveValue = fromAmount * fromValue;
  return Math.floor(effectiveValue / toValue);
};
