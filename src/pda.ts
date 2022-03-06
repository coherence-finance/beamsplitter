import { utils } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";

import { PROGRAM_ID } from "./constants";

export const generateBeamsplitterAddress = (): Promise<[PublicKey, number]> => {
  return PublicKey.findProgramAddress(
    [utils.bytes.utf8.encode("Beamsplitter")],
    PROGRAM_ID
  );
};

export const generatePrismEtfAddress = (
  mint: PublicKey
): Promise<[PublicKey, number]> => {
  return PublicKey.findProgramAddress(
    [utils.bytes.utf8.encode("PrismEtf"), mint.toBuffer()],
    PROGRAM_ID
  );
};

export const generatePrismEtfAddressTest = (): Promise<[PublicKey, number]> => {
  return PublicKey.findProgramAddress(
    [utils.bytes.utf8.encode("seeds")],
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
