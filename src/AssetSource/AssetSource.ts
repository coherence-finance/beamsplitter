import type { PublicKey, Transaction } from "@solana/web3.js";

import type { TxCallbacks } from "../CoherenceClient";

export interface SourceProps {
  nativeAmount: number;
  inputMint: PublicKey;
  outputMint: PublicKey;
  nativeWeight: number;
  slippage: number;
}

export interface AssetSource {
  sourceInAll: (
    data: { sources: SourceProps[] } & TxCallbacks
  ) => Promise<number>;
  sourceOutAll: (
    data: { sources: SourceProps[] } & TxCallbacks
  ) => Promise<number>;
  sourceSingle: (source: SourceProps) => Promise<Transaction | undefined>;
}
