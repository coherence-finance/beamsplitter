/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { newProgram } from "@saberhq/anchor-contrib";
import type { AugmentedProvider, Provider } from "@saberhq/solana-contrib";
import {
  SolanaAugmentedProvider,
  TransactionEnvelope,
} from "@saberhq/solana-contrib";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createInitMintInstructions,
  getOrCreateATA,
  getTokenAccount,
  TOKEN_PROGRAM_ID,
} from "@saberhq/token-utils";
import type { PublicKey, Signer } from "@solana/web3.js";
import { Keypair, SystemProgram } from "@solana/web3.js";
import type BN from "bn.js";

import { IDL } from "../target/types/splitcoin_prism";
import { PROGRAM_ID } from "./constants";
import { generatePrismAddress, generatePrismTokenAddress } from "./pda";
import type {
  AssetData,
  PrismData,
  PrismProgram,
  PrismTokenData,
} from "./types";

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

  static loadWithSigner({
    provider,
    signer,
  }: {
    provider: Provider;
    signer: Signer;
  }): SplitcoinPrismSDK {
    const aug = (new SolanaAugmentedProvider(provider)).withSigner(signer);
    return new SplitcoinPrismSDK(
      aug,
      newProgram<PrismProgram>(IDL, PROGRAM_ID, aug)
    );
  }

  async initialize({
    owner = this.provider.wallet.publicKey,
  }: {
    owner?: PublicKey;
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
    prism,
    mintKP = Keypair.generate(),
    authority = this.provider.wallet.publicKey,
    mintAuthority, // This can only be specified by Beamsplitter owner
    assets,
  }: {
    prism: PublicKey;
    mintKP?: Keypair;
    authority?: PublicKey;
    mintAuthority?: PublicKey;
    assets: AssetData[];
  }): Promise<TransactionEnvelope> {
    const [prismTokenKey, bump] = await generatePrismTokenAddress(
      mintKP.publicKey
    );

    const initMintTX = await createInitMintInstructions({
      provider: this.provider,
      mintKP,
      decimals: 9,
      mintAuthority: mintAuthority ? mintAuthority : prismTokenKey,
    });

    const ataInstruction = (
      await getOrCreateATA({
        provider: this.provider,
        mint: mintKP.publicKey,
        owner: authority,
      })
    ).instruction;

    /*
    const mintToInstruction = supplyTokens ? [createMintToInstruction({
      provider: this.provider,
      mint: mintKP.publicKey,
      mintAuthorityKP
    })] : [];*/

    const initPrismAndCreateAtaTx = new TransactionEnvelope(this.provider, [
      this.program.instruction.registerToken(bump, assets, {
        accounts: {
          prism,
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

  async convert({
    prism,
    fromPrism,
    toPrism,
    fromAccount = this.provider.wallet.publicKey,
    toAccount = this.provider.wallet.publicKey,
    amount,
  }: {
    prism: PublicKey;
    fromPrism: PublicKey;
    toPrism: PublicKey;
    fromAccount?: PublicKey;
    toAccount?: PublicKey;
    amount: BN;
  }): Promise<TransactionEnvelope> {
    const fromPrismAccount = await this.fetchPrismTokenData(fromPrism);
    if (!fromPrismAccount) {
      throw new Error(
        "Couldn't retrive fromPrism account. Check Prism was registered."
      );
    }

    const toPrismAccount = await this.fetchPrismTokenData(toPrism);
    if (!toPrismAccount) {
      throw new Error(
        "Couldn't retrive toPrism account. Check Prism was registered."
      );
    }

    const fromTokenAccount = await getTokenAccount(this.provider, fromAccount);
    const toTokenAccount = await getTokenAccount(this.provider, toAccount);

    const convertTx = new TransactionEnvelope(this.provider, [
      this.program.instruction.convert(amount, {
        accounts: {
          prism,
          from: fromTokenAccount.owner,
          fromToken: fromPrism,
          fromMint: fromPrismAccount.mint,
          to: toTokenAccount.owner,
          toToken: toPrism,
          toMint: toPrismAccount.mint,
          payer: this.provider.wallet.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        },
      }),
    ]);
    return convertTx;
  }

  // Fetch the main Prism state account
  async fetchPrismData(key: PublicKey): Promise<PrismData | null> {
    return (await this.program.account.prism.fetchNullable(key)) as PrismData;
  }

  async fetchPrismTokenData(key: PublicKey): Promise<PrismTokenData | null> {
    return (await this.program.account.prismToken.fetchNullable(
      key
    )) as PrismTokenData;
  }
}
