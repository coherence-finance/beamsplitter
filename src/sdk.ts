/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Market } from "@project-serum/serum";
import { PROGRAM_LAYOUT_VERSIONS } from "@project-serum/serum/lib/tokens_and_markets";
import { newProgram } from "@saberhq/anchor-contrib";
import type { AugmentedProvider, Provider } from "@saberhq/solana-contrib";
import {
  SolanaAugmentedProvider,
  TransactionEnvelope,
} from "@saberhq/solana-contrib";
import {
  createInitMintInstructions,
  createMintToInstruction,
  getOrCreateATA,
  TOKEN_PROGRAM_ID,
} from "@saberhq/token-utils";
import type { u64 } from "@solana/spl-token";
import { Token } from "@solana/spl-token";
import type { Connection, Signer } from "@solana/web3.js";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";

import { IDL } from "../target/types/coherence_beamsplitter";
import type { WeightedToken } from ".";
import { PROGRAM_ID } from "./constants";
import { generateBeamsplitterAddress, generatePrismEtfAddress } from "./pda";
import type {
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
    weightedTokens,
  }: {
    beamsplitter: PublicKey;
    mintKP?: Keypair;
    authority?: PublicKey;
    authorityKp: Keypair;
    // TODO: Remove later. Here to reduce testing redundancy
    initialSupply?: u64;
    weightedTokens: WeightedToken[];
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
        this.program.instruction.registerToken(bump, weightedTokens, {
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

  getPrice({
    owner = this.provider.wallet.publicKey,
    price,
    priceSigner,
    market,
    bids,
    dexPid = this.getLatestSerumDEXAddress(),
  }: {
    owner?: PublicKey;
    price: PublicKey;
    priceSigner: Signer;
    market: PublicKey;
    bids: PublicKey;
    dexPid?: PublicKey;
  }): TransactionEnvelope {
    return new TransactionEnvelope(
      this.provider,
      [
        this.program.instruction.getPrice(dexPid, {
          accounts: {
            price,
            payer: owner,
            systemProgram: SystemProgram.programId,
          },
          remainingAccounts: [
            {
              pubkey: market,
              isWritable: false,
              isSigner: false,
            },
            {
              pubkey: bids,
              isWritable: false,
              isSigner: false,
            },
          ],
        }),
      ],
      [priceSigner]
    );
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

  // TODO this should take pair of tokens and return market account and bid
  // For now user manually has to locate market account
  async loadMarketAndBidAccounts({
    connection,
    marketAccount,
    dexProgram = this.getLatestSerumDEXAddress(),
  }: {
    connection: Connection;
    marketAccount: PublicKey;
    dexProgram?: PublicKey;
  }): Promise<PublicKey> {
    const market = await Market.load(
      connection,
      marketAccount,
      undefined,
      dexProgram
    );
    return market.bidsAddress;
  }

  // Retrieve latest DEX address (ie version 3 at time of writing)
  getLatestSerumDEXAddress(): PublicKey {
    const latestVersion = Math.max(...Object.values(PROGRAM_LAYOUT_VERSIONS));
    const lastestAddress = Object.entries<number>(PROGRAM_LAYOUT_VERSIONS).find(
      (addrEntry) => {
        if (addrEntry[1] === latestVersion) {
          return addrEntry;
        }
      }
    );
    if (!lastestAddress)
      throw new Error("Failed to retrieve latest version of Serum DEX Address");
    return new PublicKey(lastestAddress[0]);
  }
}
