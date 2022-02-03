import { newProgram } from "@saberhq/anchor-contrib";
import type { AugmentedProvider, Provider } from "@saberhq/solana-contrib";
import {
  SolanaAugmentedProvider,
  TransactionEnvelope,
} from "@saberhq/solana-contrib";
import {
  createInitMintInstructions,
  getOrCreateATA,
} from "@saberhq/token-utils";
import type { Keypair, PublicKey } from "@solana/web3.js";
import { SystemProgram } from "@solana/web3.js";

import { IDL } from "../target/types/splitcoin_prism";
import type { PrismData } from ".";
import { generatePrismAddress } from ".";
import { PROGRAM_ID } from "./constants";
import { generatePrismAssetAddress } from "./pda";
import type { PrismAssetData, PrismProgram } from "./types";

export class SplitcoinPrismSDK {
  constructor(
    readonly provider: AugmentedProvider,
    readonly program: PrismProgram
  ) {}

  static load({ provider }: { provider: Provider }): SplitcoinPrismSDK {
    const aug = new SolanaAugmentedProvider(provider);
    return new SplitcoinPrismSDK(
      aug,
      newProgram<PrismProgram>(IDL, PROGRAM_ID, aug)
    );
  }

  async initialize({
    owner = this.provider.wallet.publicKey,
  }: {
    owner: PublicKey;
  }): Promise<TransactionEnvelope> {
    const [assetKey, bump] = await generatePrismAddress();
    return new TransactionEnvelope(this.provider, [
      this.program.instruction.initialize(bump, {
        accounts: {
          prism: assetKey,
          owner: owner,
          systemProgram: SystemProgram.programId,
        },
      }),
    ]);
  }

  async newAsset({
    mintKP,
    decimals,
    authority = this.provider.wallet.publicKey,
  }: {
    mintKP: Keypair;
    decimals: number;
    authority: PublicKey;
  }): Promise<TransactionEnvelope> {
    const [assetKey, bump] = await generatePrismAssetAddress(mintKP.publicKey);

    const initMintTX = await createInitMintInstructions({
      provider: this.provider,
      mintKP,
      decimals,
      mintAuthority: assetKey,
      freezeAuthority: assetKey,
    });

    const ataInstruction = (
      await getOrCreateATA({
        provider: this.provider,
        mint: mintKP.publicKey,
        owner: assetKey,
      })
    ).instruction;
    const initPrismAndCreateAtaTx = new TransactionEnvelope(this.provider, [
      this.program.instruction.newAsset(bump, {
        accounts: {
          prismAsset: assetKey,
          adminAuthority: authority,
          assetMint: mintKP.publicKey,
          systemProgram: SystemProgram.programId,
        },
      }),
      ...(ataInstruction ? [ataInstruction] : []),
    ]);
    return initMintTX.combine(initPrismAndCreateAtaTx);
  }

  // Fetch the main Prism state account
  async fetchPrismData(key: PublicKey): Promise<PrismData | null> {
    return (await this.program.account.prism.fetchNullable(key)) as PrismData;
  }

  async fetchAssetData(key: PublicKey): Promise<PrismAssetData | null> {
    return (await this.program.account.prismAsset.fetchNullable(
      key
    )) as PrismAssetData;
  }
}
