/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import type { Idl } from "@project-serum/anchor";
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
import { generatePrismTokenAddress } from "./pda";
import type { PrismProgram, PrismTokenData } from "./types";

export class SplitcoinPrismSDK {
  constructor(
    readonly provider: AugmentedProvider,
    readonly program: PrismProgram
  ) {}

  static load({ provider }: { provider: Provider }): SplitcoinPrismSDK {
    const aug = new SolanaAugmentedProvider(provider);
    const inserted = {
      ...IDL,
      types: [
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        ...IDL.types,
        {
          ...IDL.types.find((t) => t.name === "ConstantValueFeed"),
          name: "Feed",
        },
      ],
    };
    return new SplitcoinPrismSDK(
      aug,
      newProgram<PrismProgram>(inserted as Idl, PROGRAM_ID, aug)
    );
  }

  async initialize({
    owner = this.provider.wallet.publicKey,
  }: {
    owner: PublicKey;
  }): Promise<TransactionEnvelope> {
    const [prismTokenKey, bump] = await generatePrismAddress();
    return new TransactionEnvelope(this.provider, [
      this.program.instruction.initialize(bump, {
        accounts: {
          prism: prismTokenKey,
          owner: owner,
          systemProgram: SystemProgram.programId,
        },
      }),
    ]);
  }

  async registerToken({
    mintKP,
    decimals,
    authority = this.provider.wallet.publicKey,
  }: {
    mintKP: Keypair;
    decimals: number;
    authority: PublicKey;
  }): Promise<TransactionEnvelope> {
    const [prismTokenKey, bump] = await generatePrismTokenAddress(
      mintKP.publicKey
    );

    const initMintTX = await createInitMintInstructions({
      provider: this.provider,
      mintKP,
      decimals,
      mintAuthority: prismTokenKey,
      freezeAuthority: prismTokenKey,
    });

    const ataInstruction = (
      await getOrCreateATA({
        provider: this.provider,
        mint: mintKP.publicKey,
        owner: prismTokenKey,
      })
    ).instruction;
    const initPrismAndCreateAtaTx = new TransactionEnvelope(this.provider, [
      this.program.instruction.registerToken(bump, {
        accounts: {
          prismToken: prismTokenKey,
          adminAuthority: authority,
          tokenMint: mintKP.publicKey,
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

  async fetchAssetData(key: PublicKey): Promise<PrismTokenData | null> {
    return (await this.program.account.prismToken.fetchNullable(
      key
    )) as PrismTokenData;
  }
}
