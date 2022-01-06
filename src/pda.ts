import { utils } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";

import { PROGRAM_ID } from "./constants";

export const generatePrismAssetAddress = (
  mint: PublicKey
): Promise<[PublicKey, number]> => {
  return PublicKey.findProgramAddress(
    [utils.bytes.utf8.encode("PrismAsset"), mint.toBuffer()],
    PROGRAM_ID
  );
};
