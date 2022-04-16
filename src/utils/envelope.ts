import type { TransactionEnvelope } from "@saberhq/solana-contrib";

export const combineAndPartitionEnvelopes = (
  envelopes: TransactionEnvelope[]
) => {
  if (envelopes.length < 2) throw Error("There must be more than 1 envelope.");

  return envelopes
    .slice(1)
    .reduce((acc, env) => {
      return acc.combine(env);
    }, envelopes[0] as TransactionEnvelope)
    .partition();
};
