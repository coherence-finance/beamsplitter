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
  createMintToInstruction,
  getATAAddress,
  getOrCreateATA,
  TOKEN_PROGRAM_ID,
} from "@saberhq/token-utils";
import type { u64 } from "@solana/spl-token";
import { Token } from "@solana/spl-token";
import type { PublicKey, Signer } from "@solana/web3.js";
import { Keypair, SystemProgram } from "@solana/web3.js";
import type BN from "bn.js";

import { IDL } from "../target/types/coherence_beamsplitter";
import { PROGRAM_ID } from "./constants";
import { generateBeamsplitterAddress, generatePrismEtfAddress } from "./pda";
import type {
  AssetSource,
  BeamsplitterData,
  BeamsplitterProgram,
  PrismEtfData,
} from "./types";

export class CoherenceBeamsplitterSDK {
  constructor(
    readonly provider: AugmentedProvider,
    readonly program: BeamsplitterProgram
  ) {}

  static load({ provider }: { provider: Provider }): CoherenceBeamsplitterSDK {
    const aug = new SolanaAugmentedProvider(provider);
    return new CoherenceBeamsplitterSDK(
      aug,
      newProgram<BeamsplitterProgram>(IDL, PROGRAM_ID, aug)
    );
  }

  static loadWithSigner({
    provider,
    signer,
  }: {
    provider: Provider;
    signer: Signer;
  }): CoherenceBeamsplitterSDK {
    const aug = new SolanaAugmentedProvider(provider).withSigner(signer);
    return new CoherenceBeamsplitterSDK(
      aug,
      newProgram<BeamsplitterProgram>(IDL, PROGRAM_ID, aug)
    );
  }

  async initialize({
    owner = this.provider.wallet.publicKey,
  }: {
    owner?: PublicKey;
  }): Promise<TransactionEnvelope> {
    const [prismEtfKey, bump] = await generateBeamsplitterAddress();
    return new TransactionEnvelope(this.provider, [
      this.program.instruction.initialize(bump, {
        accounts: {
          beamsplitter: prismEtfKey,
          owner: owner,
          systemProgram: SystemProgram.programId,
        },
      }),
    ]);
  }

  // TODO: Pass multisig in so we can use it as authority for ATA
  async registerToken({
    beamsplitter,
    mintKP = Keypair.generate(),
    authority = this.provider.wallet.publicKey,
    authorityKp,
    initialSupply,
    assets,
  }: {
    beamsplitter: PublicKey;
    mintKP?: Keypair;
    authority?: PublicKey;
    authorityKp: Keypair;
    // TODO: Remove later. Here to reduce testing redundancy
    initialSupply?: u64;
    assets: AssetSource[];
  }): Promise<TransactionEnvelope> {
    const [prismEtfKey, bump] = await generatePrismEtfAddress(mintKP.publicKey);

    const initMintTX = await createInitMintInstructions({
      provider: this.provider,
      mintKP,
      decimals: 9,
      mintAuthority: authority,
    });

    const { address: toAta, instruction: ataInstruction } =
      await getOrCreateATA({
        provider: this.provider,
        mint: mintKP.publicKey,
        owner: beamsplitter,
      });

    const initBeamsplitterAndCreateAtaTx = new TransactionEnvelope(
      this.provider,
      [
        this.program.instruction.registerToken(bump, assets, {
          accounts: {
            beamsplitter,
            prismEtf: prismEtfKey,
            adminAuthority: authority,
            tokenMint: mintKP.publicKey,
            systemProgram: SystemProgram.programId,
          },
        }),
        ...(ataInstruction ? [ataInstruction] : []),
      ]
    );

    const setAuthTx = new TransactionEnvelope(
      this.provider,
      [
        Token.createSetAuthorityInstruction(
          TOKEN_PROGRAM_ID,
          mintKP.publicKey,
          beamsplitter,
          "MintTokens",
          authority,
          []
        ),
      ],
      [authorityKp]
    );

    let tx = initMintTX.combine(initBeamsplitterAndCreateAtaTx);

    if (initialSupply && authorityKp) {
      tx = tx.combine(
        createMintToInstruction({
          provider: this.provider,
          mint: mintKP.publicKey,
          mintAuthorityKP: authorityKp,
          to: toAta,
          amount: initialSupply,
        })
      );
    }

    return tx.combine(setAuthTx);
  }

  async convert({
    beamsplitter,
    fromBeamsplitter,
    toBeamsplitter,
    amount,
  }: {
    beamsplitter: PublicKey;
    fromBeamsplitter: PublicKey;
    toBeamsplitter: PublicKey;
    amount: BN;
  }): Promise<TransactionEnvelope> {
    const fromBeamsplitterAccount = await this.fetchPrismEtfData(
      fromBeamsplitter
    );
    if (!fromBeamsplitterAccount) {
      throw new Error(
        "Couldn't retrive fromBeamsplitter account. Check Beamsplitter was registered."
      );
    }

    const toBeamsplitterAccount = await this.fetchPrismEtfData(toBeamsplitter);
    if (!toBeamsplitterAccount) {
      throw new Error(
        "Couldn't retrive toBeamsplitter account. Check Beamsplitter was registered."
      );
    }

    const fromTokenAccount = await getATAAddress({
      mint: fromBeamsplitterAccount.mint,
      owner: beamsplitter,
    });
    const toTokenAccount = await getATAAddress({
      mint: toBeamsplitterAccount.mint,
      owner: beamsplitter,
    });

    const convertTx = new TransactionEnvelope(this.provider, [
      this.program.instruction.convert(amount, {
        accounts: {
          beamsplitter,
          from: fromTokenAccount,
          fromToken: fromBeamsplitter,
          fromMint: fromBeamsplitterAccount.mint,
          to: toTokenAccount,
          toToken: toBeamsplitter,
          toMint: toBeamsplitterAccount.mint,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        },
      }),
    ]);
    return convertTx;
  }

  // Fetch the main Beamsplitter state account
  async fetchBeamsplitterData(
    key: PublicKey
  ): Promise<BeamsplitterData | null> {
    return (await this.program.account.beamsplitter.fetchNullable(
      key
    )) as BeamsplitterData;
  }

  async fetchPrismEtfData(key: PublicKey): Promise<PrismEtfData | null> {
    return (await this.program.account.prismEtf.fetchNullable(
      key
    )) as PrismEtfData;
  }
}
