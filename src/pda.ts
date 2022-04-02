import { utils } from "@project-serum/anchor";
import { u64 } from "@saberhq/token-utils";
import { PublicKey } from "@solana/web3.js";

import { PROGRAM_ID } from "./constants";

export const generateBeamsplitterAddress = (): Promise<[PublicKey, number]> => {
  return PublicKey.findProgramAddress(
    [utils.bytes.utf8.encode("Beamsplitter")],
    PROGRAM_ID
  );
};

export const generatePrismEtfAddress = (
  mint: PublicKey,
  beamsplitter: PublicKey
): Promise<[PublicKey, number]> => {
  return PublicKey.findProgramAddress(
    [
      utils.bytes.utf8.encode("PrismEtf"),
      mint.toBuffer(),
      beamsplitter.toBuffer(),
    ],
    PROGRAM_ID
  );
};

export const generateOrderStateAddress = (
  mint: PublicKey,
  beamsplitter: PublicKey,
  id: number
): Promise<[PublicKey, number]> => {
  return PublicKey.findProgramAddress(
    [
      utils.bytes.utf8.encode("OrderState"),
      beamsplitter.toBuffer(),
      mint.toBuffer(),
      new u64(id).toBuffer(),
    ],
    PROGRAM_ID
  );
};

export const generateOrderStateAddressLegacy = (
  mint: PublicKey,
  beamsplitter: PublicKey,
  orderer: PublicKey
): Promise<[PublicKey, number]> => {
  return PublicKey.findProgramAddress(
    [
      utils.bytes.utf8.encode("OrderState"),
      mint.toBuffer(),
      orderer.toBuffer(),
      beamsplitter.toBuffer(),
    ],
    PROGRAM_ID
  );
};

export const generateWeightedTokensAddress = (
  creator: PublicKey
): Promise<[PublicKey, number]> => {
  return PublicKey.findProgramAddress(
    [utils.bytes.utf8.encode("WeightedTokens"), creator.toBuffer()],
    PROGRAM_ID
  );
};
