import type { AnchorTypes } from "@saberhq/anchor-contrib";
import type { PublicKey } from "@solana/web3.js";

import type { CoherenceBeamsplitter } from "../target/types/coherence_beamsplitter";

export type BeamsplitterTypes = AnchorTypes<
  CoherenceBeamsplitter,
  {
    prismEtf: PrismEtfData;
    beamsplitter: BeamsplitterData;
    weightedTokens: WeightedTokensData;
    transferredTokens: TransferredTokensData;
  }
>;

type Accounts = BeamsplitterTypes["Accounts"];
export type PrismEtfData = Accounts["prismEtf"];
export type BeamsplitterData = Accounts["beamsplitter"];
export type WeightedTokensData = Omit<
  Accounts["weightedTokens"],
  "weightedTokens"
> & { weightedTokens: WeightedToken[] };
export type TransferredTokensData = Accounts["transferredTokens"];
export type BeamsplitterProgram = BeamsplitterTypes["Program"];

export type Defined = BeamsplitterTypes["Defined"];
export type WeightedToken = Defined["WeightedToken"];

// TODO figure out how to get this out of idl
export const WEIGHTED_TOKENS_SIZE = 589832 + 8; // Bytes
export const TRANSFERRED_TOKENS_SIZE = 16392 + 8; // Bytes
export const WEIGHTED_TOKENS_CAPACITY = 16384;

export type RequiredMarketAccounts = {
  marketAccount: PublicKey;
  bidAccount: PublicKey;
  askAccount: PublicKey;
};
