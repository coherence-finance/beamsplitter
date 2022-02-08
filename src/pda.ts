import { utils } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";

import { PROGRAM_ID } from "./constants";

export const generatePrismAddress = (): Promise<[PublicKey, number]> => {
  return PublicKey.findProgramAddress(
    [utils.bytes.utf8.encode("Prism")],
    PROGRAM_ID
  );
};

export const generatePrismTokenAddress = (
  mint: PublicKey
): Promise<[PublicKey, number]> => {
  return PublicKey.findProgramAddress(
    [utils.bytes.utf8.encode("PrismToken"), mint.toBuffer()],
    PROGRAM_ID
  );
};
