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
import { createInitMintInstructions, getMintInfo } from "@saberhq/token-utils";
import type { Connection, Signer } from "@solana/web3.js";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { BN } from "bn.js";

import { IDL } from "../target/types/coherence_beamsplitter";
import { PROGRAM_ID } from "./constants";
import { generateBeamsplitterAddress, generatePrismEtfAddress } from "./pda";
import type {
  BeamsplitterData,
  BeamsplitterProgram,
  PrismEtfData,
  WeightedToken,
  WeightedTokensData,
} from "./types";
import { TRANSFERRED_TOKENS_SIZE, WEIGHTED_TOKENS_SIZE } from "./types";

// How many weighted tokens are chunked together per tx
const TX_CHUNK_SIZE = 24;

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

  async _initWeightedTokens({
    weightedTokensKP = Keypair.generate(),
  }: {
    weightedTokensKP?: Keypair;
  }): Promise<TransactionEnvelope> {
    const weightedTokensTx =
      await this.program.account.weightedTokens.createInstruction(
        weightedTokensKP,
        WEIGHTED_TOKENS_SIZE
      );

    return new TransactionEnvelope(
      this.provider,
      [
        weightedTokensTx,
        this.program.instruction.initWeightedTokens({
          accounts: {
            weightedTokens: weightedTokensKP.publicKey,
          },
        }),
      ],
      [weightedTokensKP]
    );
  }

  async _initTransferredTokens({
    transferredTokensKP = Keypair.generate(),
  }: {
    transferredTokensKP?: Keypair;
  }): Promise<TransactionEnvelope> {
    const transferredTokensTx =
      await this.program.account.weightedTokens.createInstruction(
        transferredTokensKP,
        TRANSFERRED_TOKENS_SIZE
      );

    return new TransactionEnvelope(
      this.provider,
      [
        transferredTokensTx,
        this.program.instruction.initTransferredTokens({
          accounts: {
            transferredTokens: transferredTokensKP.publicKey,
          },
        }),
      ],
      [transferredTokensKP]
    );
  }

  // Initialize a new PrismEtf PDA (and included weighted tokens account), returns TransactionEnvelope along with key of PrismEtfMint
  async initPrismEtf({
    beamsplitter,
    prismEtfMint, // SPL token mint for the ETF, if not specified, a token is created for you
  }: {
    beamsplitter: PublicKey;
    prismEtfMint?: PublicKey;
  }): Promise<[TransactionEnvelope, PublicKey]> {
    const weightedTokensKP = Keypair.generate();

    // Allocate the WeightedTokens Envelope
    let initPrismEtfEnvelope = await this._initWeightedTokens({
      weightedTokensKP,
    });

    if (!prismEtfMint) {
      const prismEtfMintKP = Keypair.generate();
      // Intialize a SPL Token mint for this token
      const initMintEnvelope = await createInitMintInstructions({
        provider: this.provider,
        mintKP: prismEtfMintKP,
        decimals: 9,
        mintAuthority: beamsplitter,
      });

      prismEtfMint = prismEtfMintKP.publicKey;
      initPrismEtfEnvelope = initPrismEtfEnvelope.combine(initMintEnvelope);
    } else {
      const prismEtfMintData = await getMintInfo(this.provider, prismEtfMint);

      if (!prismEtfMintData.supply.eq(new BN(0))) {
        throw new Error("Prism ETF token supply must start at zero.");
      }

      if (prismEtfMintData.mintAuthority !== beamsplitter) {
        throw new Error("PrismETF token mint Authority is not beamsplitter");
      }
    }

    // Find the pda of the prismEtf account being initialized
    const [prismEtfPda, bump] = await generatePrismEtfAddress(
      prismEtfMint,
      beamsplitter
    );

    // Initialize the prism Etf account
    const initPrismEtfTx = this.program.instruction.initPrismEtf(bump, {
      accounts: {
        prismEtf: prismEtfPda,
        prismEtfMint,
        weightedTokens: weightedTokensKP.publicKey,
        manager: this.provider.wallet.publicKey,
        beamsplitter: beamsplitter,
        systemProgram: SystemProgram.programId,
      },
    });

    initPrismEtfEnvelope.addInstructions(initPrismEtfTx);

    return [initPrismEtfEnvelope, prismEtfMint];
  }

  // Push tokens into Prism ETF being built
  async pushTokens({
    beamsplitter, // Beamsplitter program
    weightedTokens, // Weighted tokens being pushed into the Prism ETF (may be empty)
    prismEtfMint, // Mint of the corresponding PrismEtf SPL token
  }: {
    beamsplitter: PublicKey;
    weightedTokens: WeightedToken[];
    prismEtfMint: PublicKey;
  }): Promise<TransactionEnvelope[]> {
    const [prismEtf] = await generatePrismEtfAddress(
      prismEtfMint,
      beamsplitter
    );

    const prismEtfData = await this.fetchPrismEtfData(prismEtf);

    if (!prismEtfData) {
      throw new Error(
        "prismEtf PDA derived from prismEtfMint passed does not exist. Use initPrismEtf to initialize the PDA and pass in the resulting mint PublicKey."
      );
    }

    if (prismEtfData.isFinished) {
      throw new Error(
        "prismEtf.is_finished is true. Etf is already done being designed. Use rebalancing to modify it further."
      );
    }

    if (!this.provider.wallet.publicKey.equals(prismEtfData.manager)) {
      throw new Error("You must be manager of the PrismEtf to modify it.");
    }

    const pushTokenTxChunks: TransactionEnvelope[] = [];
    for (let i = 0; i < weightedTokens.length; i += TX_CHUNK_SIZE) {
      const weightedTokensChunk = weightedTokens.slice(i, i + TX_CHUNK_SIZE);
      pushTokenTxChunks.push(
        new TransactionEnvelope(this.provider, [
          this.program.instruction.pushTokens(weightedTokensChunk, {
            accounts: {
              prismEtf,
              prismEtfMint,
              beamsplitter,
              weightedTokens: prismEtfData.weightedTokens,
              manager: this.provider.wallet.publicKey,
              systemProgram: SystemProgram.programId,
            },
          }),
        ])
      );
    }

    return pushTokenTxChunks;
  }

  // Finalize PrismETF (you will no longer be able to modify it without rebalancing)
  async finalizePrismEtf({
    beamsplitter,
    prismEtfMint,
  }: {
    beamsplitter: PublicKey;
    prismEtfMint: PublicKey;
  }): Promise<TransactionEnvelope> {
    const [prismEtf] = await generatePrismEtfAddress(
      prismEtfMint,
      beamsplitter
    );
    return new TransactionEnvelope(this.provider, [
      this.program.instruction.finalizePrismEtf({
        accounts: {
          beamsplitter,
          prismEtf,
          prismEtfMint,
        },
      }),
    ]);
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

  // Gets the PrismEtf from it's corresponding Mint and Beamsplitter seeds
  async fetchPrismEtfDataFromSeeds({
    beamsplitter,
    prismEtfMint,
  }: {
    beamsplitter: PublicKey;
    prismEtfMint: PublicKey;
  }): Promise<PrismEtfData | null> {
    const [prismEtf] = await generatePrismEtfAddress(
      prismEtfMint,
      beamsplitter
    );
    return await this.fetchPrismEtfData(prismEtf);
  }

  /*
  async fetchWeightedTokensFromPrismEtf(
    key: PublicKey
  ): Promise<WeightedTokensData | null> {
    const prismEtfData = await this.fetchPrismEtfData(key);

    if (!prismEtfData) {
      throw new Error(
        "prismEtf PDA derived from prismEtfMint passed does not exist. Use initPrismEtf to initialize the PDA and pass in the resulting mint PublicKey."
      );
    }

    return (await this.program.account.weightedTokens.fetchNullable(
      prismEtfData.weightedTokens
    )) as PrismEtfData;
  }*/

  async fetchWeightedTokens(
    key: PublicKey
  ): Promise<WeightedTokensData | null> {
    return (await this.program.account.weightedTokens.fetchNullable(
      key
    )) as WeightedTokensData;
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
