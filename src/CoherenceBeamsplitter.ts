import type { TransactionEnvelope } from "@saberhq/solana-contrib";
import {
  createInitMintInstructions,
  getMintInfo,
  getOrCreateATA,
} from "@saberhq/token-utils";
import type { PublicKey } from "@solana/web3.js";
import { Keypair, SystemProgram } from "@solana/web3.js";
import BN from "bn.js";

import type { CoherenceLoader } from "./CoherenceLoader";
import { generateBeamsplitterAddress, generatePrismEtfAddress } from "./pda";
import type { BeamsplitterData, WeightedToken } from "./types";
import { WEIGHTED_TOKENS_SIZE } from "./types";

// Number of decimals used by prism etf by default
export const PRISM_ETF_DECIMALS = 9;

export class CoherenceBeamsplitter {
  constructor(
    readonly loader: CoherenceLoader,
    readonly beamsplitter: PublicKey,
    readonly beamsplitterBump: number,
    readonly beamsplitterData: BeamsplitterData | null
  ) {}

  static async loadBeamsplitter({
    loader,
  }: {
    readonly loader: CoherenceLoader;
  }): Promise<CoherenceBeamsplitter> {
    const [beamsplitter, bump] = await generateBeamsplitterAddress();
    const beamsplitterData = await loader.fetchBeamsplitterData(beamsplitter);
    return new CoherenceBeamsplitter(
      loader,
      beamsplitter,
      bump,
      beamsplitterData
    );
  }

  initialize({
    owner = this.loader.getUserPublicKey(),
  }: {
    owner?: PublicKey;
  }): TransactionEnvelope {
    return this.loader.makeProviderEnvelope([
      this.loader.program.instruction.initialize(this.beamsplitterBump, {
        accounts: {
          beamsplitter: this.beamsplitter,
          owner,
          systemProgram: SystemProgram.programId,
        },
      }),
    ]);
  }

  async initWeightedTokens({
    weightedTokensKP = Keypair.generate(),
  }: {
    weightedTokensKP?: Keypair;
  }): Promise<TransactionEnvelope> {
    const weightedTokensTx =
      await this.loader.program.account.weightedTokens.createInstruction(
        weightedTokensKP,
        WEIGHTED_TOKENS_SIZE
      );

    return this.loader.makeProviderEnvelope(
      [
        weightedTokensTx,
        this.loader.program.instruction.initWeightedTokens({
          accounts: {
            weightedTokens: weightedTokensKP.publicKey,
          },
        }),
      ],
      [weightedTokensKP]
    );
  }

  // Initialize a new PrismEtf PDA (and included weighted tokens account), returns TransactionEnvelope along with key of PrismEtfMint
  async initPrismEtf({
    prismEtfMint,
    manager = this.loader.getUserPublicKey(),
  }: {
    prismEtfMint?: PublicKey;
    manager?: PublicKey;
  }): Promise<[TransactionEnvelope, PublicKey, PublicKey, PublicKey, number]> {
    const weightedTokensKP = Keypair.generate();

    // Allocate the WeightedTokens Envelope
    let initPrismEtfEnvelope = await this.initWeightedTokens({
      weightedTokensKP,
    });

    if (prismEtfMint === undefined) {
      const prismEtfMintKP = Keypair.generate();
      // Intialize a SPL Token mint for this token
      const initMintEnvelope = await createInitMintInstructions({
        provider: this.loader.provider,
        mintKP: prismEtfMintKP,
        decimals: PRISM_ETF_DECIMALS,
        mintAuthority: this.beamsplitter,
      });

      prismEtfMint = prismEtfMintKP.publicKey;
      initPrismEtfEnvelope = initPrismEtfEnvelope.combine(initMintEnvelope);
    } else {
      const prismEtfMintData = await getMintInfo(
        this.loader.provider,
        prismEtfMint
      );

      if (!prismEtfMintData.supply.eq(new BN(0))) {
        throw new Error("Prism ETF token supply must start at zero.");
      }

      if (!prismEtfMintData.mintAuthority?.equals(this.beamsplitter)) {
        throw new Error("PrismETF token mint Authority is not beamsplitter");
      }
    }

    // Find the pda of the prismEtf account being initialized
    const [prismEtfPda, bump] = await generatePrismEtfAddress(
      prismEtfMint,
      this.beamsplitter
    );

    // Initialize the prism Etf account
    const initPrismEtfTx = this.loader.program.instruction.initPrismEtf(bump, {
      accounts: {
        prismEtf: prismEtfPda,
        prismEtfMint,
        weightedTokens: weightedTokensKP.publicKey,
        manager,
        beamsplitter: this.beamsplitter,
        systemProgram: SystemProgram.programId,
      },
    });

    initPrismEtfEnvelope.append(initPrismEtfTx);

    return [
      initPrismEtfEnvelope,
      prismEtfMint,
      prismEtfPda,
      weightedTokensKP.publicKey,
      bump,
    ];
  }

  // Push tokens into Prism ETF being built
  async pushTokens({
    prismEtfMint, // Mint of the corresponding PrismEtf SPL token
    prismEtfPda,
    weightedTokens, // Weighted tokens being pushed into the Prism ETF (may be empty)
    weightedTokensAcct, // Key of weighted tokens account (found inside prismETF PDA)
    shouldCreateAtas = true, // Creates ATA's for each weighted token mint for the PrismETF PDA (this should usually be true)
    manager = this.loader.getUserPublicKey(),
  }: {
    prismEtfMint: PublicKey;
    prismEtfPda: PublicKey;
    weightedTokens: WeightedToken[];
    weightedTokensAcct: PublicKey;
    shouldCreateAtas?: boolean;
    manager?: PublicKey;
  }): Promise<TransactionEnvelope[]> {
    const pushTokenTxChunk = this.loader.makeProviderEnvelope([]);

    for (const token of weightedTokens) {
      const { mint } = token;

      // Setup ATA's for PDA
      const { instruction: createATATx } = await getOrCreateATA({
        provider: this.loader.provider,
        mint,
        owner: prismEtfPda,
      });

      if (shouldCreateAtas && createATATx !== null) {
        pushTokenTxChunk.append(createATATx);
      }

      pushTokenTxChunk.append(
        this.loader.program.instruction.pushTokens([token], {
          accounts: {
            prismEtf: prismEtfPda,
            prismEtfMint,
            beamsplitter: this.beamsplitter,
            weightedTokens: weightedTokensAcct,
            manager,
            systemProgram: SystemProgram.programId,
          },
        })
      );
    }

    return pushTokenTxChunk.partition();
  }

  // Finalize PrismETF (you will no longer be able to modify it without rebalancing)
  async finalizePrismEtf({
    prismEtfMint,
    prismEtfPda,
    shouldCreateAtas = true,
    manager = this.loader.getUserPublicKey(),
  }: {
    prismEtfMint: PublicKey;
    prismEtfPda: PublicKey;
    shouldCreateAtas?: boolean;
    manager?: PublicKey;
  }): Promise<TransactionEnvelope> {
    const finalizeTx = this.loader.makeProviderEnvelope([]);

    if (this.beamsplitterData === null) {
      throw new Error(
        "You must create the beamsplitter first. Call initialize()"
      );
    }

    const beamsplitterOwner = this.beamsplitterData.owner;

    const owners = [
      beamsplitterOwner,
      ...(beamsplitterOwner.equals(manager) ? [] : [manager]),
    ];

    for (const owner of owners) {
      const { instruction: createOwnerAtaTx } = await getOrCreateATA({
        provider: this.loader.provider,
        mint: prismEtfMint,
        owner,
      });

      if (shouldCreateAtas && createOwnerAtaTx !== null) {
        finalizeTx.append(createOwnerAtaTx);
      }
    }

    finalizeTx.append(
      this.loader.program.instruction.finalizePrismEtf({
        accounts: {
          manager,
          beamsplitter: this.beamsplitter,
          prismEtf: prismEtfPda,
          prismEtfMint,
        },
      })
    );

    return finalizeTx;
  }

  setOwner({ newOwner }: { newOwner: PublicKey }): TransactionEnvelope {
    return this.loader.makeProviderEnvelope([
      this.loader.program.instruction.setOwner({
        accounts: {
          owner: this.loader.getUserPublicKey(),
          newOwner,
          beamsplitter: this.beamsplitter,
        },
      }),
    ]);
  }

  async fetchBeamsplitterData(
    key: PublicKey
  ): Promise<BeamsplitterData | null> {
    return (await this.loader.program.account.beamsplitter.fetchNullable(
      key
    )) as BeamsplitterData;
  }
}
