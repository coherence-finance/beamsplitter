import type { Idl, Provider } from "@project-serum/anchor";
import { Program, web3 } from "@project-serum/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  Token,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import type { TransactionSignature } from "@solana/web3.js";
import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import BN from "bn.js";
import splTokenAirdropIdl from "spl-token-faucet/app/src/config/spl_token_faucet.json";

export const SPL_TOKEN_AIRDROP_PID =
  "4sN8PnN2ki2W4TFXAfzR645FWs8nimmsYeNtxM8RBK6A";

export const MAINNET_CONNECTION = new Connection(
  "https://api.mainnet-beta.solana.com"
);

export async function airdropSplTokens({
  provider,
  amount,
  to = provider.wallet.publicKey,
  mintPda,
  mintPdaBump,
}: {
  provider: Provider;
  to?: PublicKey;
  amount: BN;
  mintPda: PublicKey;
  mintPdaBump: number;
}): Promise<TransactionSignature> {
  try {
    const program = new Program(
      splTokenAirdropIdl as Idl,
      SPL_TOKEN_AIRDROP_PID,
      provider
    );
    const receiver = new PublicKey(to);
    const amountToAirdrop = new BN(amount.toNumber() * 1000000);

    const associatedTokenAccount = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      mintPda,
      receiver,
      true
    );

    const RPC = program.rpc;

    if (!RPC.airdrop)
      throw new Error("Error getting airdorp rpc on SPL token airdrop");

    const signature = await RPC.airdrop(mintPdaBump, amountToAirdrop, {
      accounts: {
        mint: mintPda,
        destination: associatedTokenAccount,
        payer: provider.wallet.publicKey,
        receiver: receiver,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: web3.SYSVAR_RENT_PUBKEY,
      },
      signers: [],
    });
    return signature;
  } catch (err) {
    throw new Error("Couldn't spl airdrop tokens");
  }
}

// TODO: Support use of `expo` in here when it gets implemented in `utils.rs`
/*export const getWeightedTokensValue = (weightedTokens: WeightedToken[]) => {
  return weightedTokens.reduce((acc, { mint, weight }) => {

    return acc + price.mul(weight).toNumber();
  }, 0);
};*/

/*export const getToAmount = (
  fromWeightedTokens: WeightedToken[],
  toWeightedTokens: WeightedToken[],
  fromAmount: number
) => {
  const fromValue = getPrismEtfValue(fromWeightedTokens);
  const toValue = getPrismEtfValue(toWeightedTokens);

  const effectiveValue = fromAmount * fromValue;
  return Math.floor(effectiveValue / toValue);
};
*/
