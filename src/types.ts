import { ACCOUNT_DISCRIMINATOR_SIZE } from "@project-serum/anchor";
import type { AnchorTypes } from "@saberhq/anchor-contrib";
import type { PublicKey } from "@solana/web3.js";

import type { CoherenceBeamsplitter } from "./coherence_beamsplitter";
import CoherenceBeamsplitterIDL from "./coherence_beamsplitter_idl.json";

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

export const WEIGHTED_TOKENS_CAPACITY = parseInt(
  (CoherenceBeamsplitterIDL as unknown as CoherenceBeamsplitter).constants.find(
    (constant) => {
      return constant.name === "MAX_WEIGHTED_TOKENS";
    }
  )?.value ?? "1"
);

export const WEIGHTED_TOKEN_BYTE_SIZE = 40; // WeightedToken Struct size in bytes, u64 (8 bytes) + Pubkey (32 bytes)
export const WEIGHTED_TOKENS_BYTE_SIZE = 4; // Weighted tokens metadata size in bytes, u16 + u16

export const WEIGHTED_TOKENS_SIZE =
  WEIGHTED_TOKENS_CAPACITY * WEIGHTED_TOKEN_BYTE_SIZE +
  WEIGHTED_TOKENS_BYTE_SIZE +
  ACCOUNT_DISCRIMINATOR_SIZE; // Bytes

export const TRANSFERRED_TOKENS_BYTE_SIZE = 4; // Transferred tokens metadata size in bytes, u16 + u16

export const TRANSFERRED_TOKENS_SIZE =
  WEIGHTED_TOKENS_CAPACITY +
  TRANSFERRED_TOKENS_BYTE_SIZE +
  ACCOUNT_DISCRIMINATOR_SIZE; // Bytes

export enum OrderType {
  CONSTRUCTION = "construction",
  DECONSTRUCTION = "deconstruction",
}

export enum OrderStatus {
  PENDING = "pending",
  SUCCEEDED = "succeeded",
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
