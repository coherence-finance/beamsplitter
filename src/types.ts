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
export type WeightedTokensData = Accounts["weightedTokens"];
export type TransferredTokensData = Accounts["transferredTokens"];
export type BeamsplitterProgram = BeamsplitterTypes["Program"];

export type Defined = BeamsplitterTypes["Defined"];
export type WeightedToken = Defined["WeightedToken"];

// TODO figure out how to get this out of idl
export const WEIGHTED_TOKENS_SIZE = 81928 + 8;
export const TRANSFERRED_TOKENS_SIZE = 16392 + 8;

export type RequiredMarketAccounts = {
  marketAccount: PublicKey;
  bidAccount: PublicKey;
  askAccount: PublicKey;
};
