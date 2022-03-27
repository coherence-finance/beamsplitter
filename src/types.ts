import type { AnchorTypes } from "@saberhq/anchor-contrib";
import type { PublicKey } from "@solana/web3.js";

import type { CoherenceBeamsplitter } from "./coherence_beamsplitter";
//import CoherenceBeamsplitterIDL from "./coherence_beamsplitter.json";

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
export const WEIGHTED_TOKENS_SIZE = 4004 + 8; // Bytes
export const TRANSFERRED_TOKENS_SIZE = 104 + 8; // Bytes
export const WEIGHTED_TOKENS_CAPACITY = 100;

/*export const constants = CoherenceBeamsplitterIDL.constants.reduce(
  (acc, next) => {
    return {
      ...acc,
      [next.name]: parseInt(next.value),
    };
  }
);*/

export enum OrderType {
  CONSTRUCTION = "construction",
  DECONSTRUCTION = "deconstruction",
}

export type EnumLike = { name: never };

export const enumLikeToString = (enumLike: unknown | EnumLike) =>
  Object.keys(enumLike as EnumLike)[0]?.toLocaleLowerCase() as string;

export const stringToEnumLike = (name: string) => {
  return { [name]: {} };
};

export type RequiredMarketAccounts = {
  marketAccount: PublicKey;
  bidAccount: PublicKey;
  askAccount: PublicKey;
};
