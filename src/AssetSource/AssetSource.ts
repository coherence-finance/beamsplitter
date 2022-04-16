import type { PublicKey, Transaction } from "@solana/web3.js";

export interface SourceProps {
  nativeAmount: number;
  inputMint: PublicKey;
  outputMint: PublicKey;
  nativeWeight: number;
  slippage: number;
}

export interface AssetSource {
  sourceInAll: (sources: SourceProps[]) => Promise<number>;
  sourceOutAll: (sources: SourceProps[]) => Promise<number>;
  sourceSingle: (source: SourceProps) => Promise<Transaction | undefined>;
}
