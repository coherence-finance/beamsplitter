import type { AnchorTypes } from "@saberhq/anchor-contrib";
import type { PublicKey } from "@solana/web3.js";

import type { CoherenceBeamsplitter } from "./coherence_beamsplitter";

export type BeamsplitterTypes = AnchorTypes<
  CoherenceBeamsplitter,
  {
    prismEtf: PrismEtfData;
    beamsplitter: BeamsplitterData;
    weightedTokens: WeightedTokensData;
    transferredTokens: TransferredTokensData;
    orderState: OrderStateData;
  }
>;

type Accounts = BeamsplitterTypes["Accounts"];
export type PrismEtfData = Accounts["prismEtf"];
export type BeamsplitterData = Accounts["beamsplitter"];
export type WeightedTokensData = Omit<
  Accounts["weightedTokens"],
  "weightedTokens"
> & { weightedTokens: WeightedToken[] };
export type OrderStateData = Accounts["orderState"];
export type TransferredTokensData = Accounts["transferredTokens"];
export type BeamsplitterProgram = BeamsplitterTypes["Program"];

export type Defined = BeamsplitterTypes["Defined"];
export type WeightedToken = Defined["WeightedToken"];

// TODO figure out how to get this out of idl
export const WEIGHTED_TOKENS_SIZE = 368 + 8; // Bytes
export const TRANSFERRED_TOKENS_SIZE = 20 + 8; // Bytes
export const WEIGHTED_TOKENS_CAPACITY = 10;

export type RequiredMarketAccounts = {
  marketAccount: PublicKey;
  bidAccount: PublicKey;
  askAccount: PublicKey;
};
