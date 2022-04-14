import { expectTX } from "@saberhq/chai-solana";
import { TransactionEnvelope } from "@saberhq/solana-contrib";
import {
  getATAAddress,
  getOrCreateATA,
  getTokenAccount,
} from "@saberhq/token-utils";
import type { PublicKey } from "@solana/web3.js";
import type BN from "bn.js";

import { coherenceHelper } from "./coherenceBeamsplitterTest";

/*
Includes a suite of commonly used functionality for retrieving ATA balances, account lamports (SOL balance), tracking diffs, etc
*/

// Setup an ATA safely
export const setupATA = async (
  mint: PublicKey,
  authority: PublicKey = coherenceHelper.authority
): Promise<PublicKey> => {
  const { address, instruction } = await getOrCreateATA({
    provider: coherenceHelper.provider,
    mint,
    owner: authority,
  });
  if (instruction) {
    await expectTX(
      new TransactionEnvelope(coherenceHelper.provider, [instruction])
    ).to.be.fulfilled;
  }
  return address;
};

export const ataBalance = async (ataAddress: PublicKey): Promise<BN> => {
  const tokenAccount = await getTokenAccount(
    coherenceHelper.provider,
    ataAddress
  );
  return tokenAccount.amount;
};

// Get ATA token balance from PDA seeds
export const ataBalanceFromSeeds = async (
  mint: PublicKey,
  authority: PublicKey = coherenceHelper.authority
): Promise<BN> => {
  const ataAddress = await getATAAddress({ mint, owner: authority });
  return ataBalance(ataAddress);
};
