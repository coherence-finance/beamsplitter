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
  TOKEN_PROGRAM_ID,
} from "@saberhq/token-utils";
import { Token } from "@solana/spl-token";
import type { Connection, Signer } from "@solana/web3.js";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";

import { IDL } from "../target/types/coherence_beamsplitter";
import { PROGRAM_ID } from "./constants";
import { generateBeamsplitterAddress, generatePrismEtfAddress } from "./pda";
import type {
  BeamsplitterData,
  BeamsplitterProgram,
  PrismEtfData,
  WeightedToken,
} from "./types";
import { TRANSFERRED_TOKENS_SIZE, WEIGHTED_TOKENS_SIZE } from "./types";

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

  async _initPrismEtf({
    beamsplitter,
    mintKP = Keypair.generate(), // KP used for mint account
    mint = mintKP.publicKey, // SPL token mint for the ETF, if not specified, a token is created using intialMintAuthorityKp
    weightedTokensKP = Keypair.generate(), // Keypair used to alloc the weighted token account
    iniitalMintAuthorityKp = Keypair.generate(), // Keypair used to alloc the weighted token account
    assignedMintAuthority = beamsplitter, // The mint authority of the spl token mint, which must be beamsplitter unless provider.wallet is owner of beamsplitter
  }: {
    beamsplitter: PublicKey;
    mint?: PublicKey;
    weightedTokensKP?: Keypair;
    iniitalMintAuthorityKp?: Keypair;
    assignedMintAuthority?: PublicKey;
    mintKP?: Keypair;
  }): Promise<TransactionEnvelope> {
    // Allocate the WeightedTokens Envelope
    const initWeightedTokensEnvelope = await this._initWeightedTokens({
      weightedTokensKP,
    });

    // Intialize a SPL Token mint for this token
    const initMintTx = await createInitMintInstructions({
      provider: this.provider,
      mintKP,
      decimals: 9,
      mintAuthority: iniitalMintAuthorityKp.publicKey,
    });

    // Find the pda of the prismEtf account being initialized
    const [prismEtfPda, bump] = await generatePrismEtfAddress(
      mint,
      beamsplitter
    );

    // Transfer authority of the mint to assignedAuthority (which should be Beamsplitter, except for testing)
    const setAuthEnvelopeEnvelope = new TransactionEnvelope(
      this.provider,
      [
        Token.createSetAuthorityInstruction(
          TOKEN_PROGRAM_ID,
          mintKP.publicKey,
          beamsplitter,
          "MintTokens",
          assignedMintAuthority,
          []
        ),
      ],
      [iniitalMintAuthorityKp]
    );

    // Initialize the prism Etf account
    const initPrismEtfTx = this.program.instruction.initPrismEtf(bump, {
      accounts: {
        prismEtf: prismEtfPda,
        prismEtfMint: mint,
        weightedTokens: weightedTokensKP.publicKey,
        manager: this.provider.wallet.publicKey,
        beamsplitter: beamsplitter,
        systemProgram: SystemProgram.programId,
      },
    });

    // Combine the envelopes together, in order
    const initPrismEtfEnvelope = initWeightedTokensEnvelope
      .combine(initMintTx)
      .combine(setAuthEnvelopeEnvelope)
      .addInstructions(initPrismEtfTx);

    return initPrismEtfEnvelope;
  }

  // Push tokens into Prism ETF being built
  async pushTokens({
    beamsplitter, // Beamsplitter program
    weightedTokens, // Weighted tokens being pushed into the Prism ETF (may be empty)
    prismEtfMint, // Mint of the corresponding PrismEtf SPL token, must be passed if the PrismEtf was inited already
  }: {
    beamsplitter: PublicKey;
    weightedTokens: WeightedToken[];
    prismEtfMint?: PublicKey;
  }): Promise<TransactionEnvelope> {
    const pushTokensEnvelope = new TransactionEnvelope(this.provider, []);

    // Initialize new Prism ETF if no mint is given
    if (!prismEtfMint) {
      const prismEtfMintKp = Keypair.generate();
      pushTokensEnvelope.combine(
        await this._initPrismEtf({
          beamsplitter,
        })
      );
      prismEtfMint = prismEtfMintKp.publicKey;
    }

    const [prismEtf] = await generatePrismEtfAddress(
      prismEtfMint,
      beamsplitter
    );

    const prismEtfData = await this.fetchPrismEtfData(prismEtf);

    if (!prismEtfData) {
      throw new Error(
        "prismEtf PDA derived from prismEtfMint passed does not exist. Delete `prismEtfMint` arguement to automagically create it."
      );
    }

    if (prismEtfData.isFinished) {
      throw new Error(
        "prismEtf.is_finished is true. Etf is already done being designed. Use rebalancing to modify it further."
      );
    }

    if (this.provider.wallet.publicKey !== prismEtfData.manager) {
      throw new Error("You must be manager of the PrismEtf to modify it.");
    }

    // TODO batch these in groups of two or more to save on Tx costs
    for (const weightedToken of weightedTokens) {
      pushTokensEnvelope.addInstructions(
        this.program.instruction.pushTokens([weightedToken], {
          accounts: {
            prismEtf,
            prismEtfMint,
            beamsplitter,
            weightedTokens: prismEtfData.weightedTokens,
            manager: this.provider.wallet.publicKey,
            systemProgram: SystemProgram.programId,
          },
        })
      );
    }

    return pushTokensEnvelope;
  }

  // TODO: Finalize PrismETF (you will no longer be able to modify it without rebalancing)
  //async finalizePrismEtf() {}

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
