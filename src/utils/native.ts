export const getNativeValue = (n: number, decimals: number) => {
  return n * Math.pow(10, decimals);
};

export const getDecimalValue = (n: number, decimals: number) => {
  return n / Math.pow(10, decimals);
};
