import { newProgram } from "@saberhq/anchor-contrib";
import type { AugmentedProvider, Provider } from "@saberhq/solana-contrib";
import {
  SolanaAugmentedProvider,
  TransactionEnvelope,
} from "@saberhq/solana-contrib";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createInitMintInstructions,
  getMintInfo,
  getOrCreateATA,
  TOKEN_PROGRAM_ID,
} from "@saberhq/token-utils";
import type { PublicKey, Signer } from "@solana/web3.js";
import { Keypair, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import BN from "bn.js";

import { IDL } from "./coherence_beamsplitter";
import { PROGRAM_ID } from "./constants";
import {
  generateBeamsplitterAddress,
  generateOrderStateAddress,
  generatePrismEtfAddress,
} from "./pda";
import type {
  BeamsplitterData,
  BeamsplitterProgram,
  OrderStateData,
  PrismEtfData,
  WeightedToken,
  WeightedTokensData,
} from "./types";
import { TRANSFERRED_TOKENS_SIZE, WEIGHTED_TOKENS_SIZE } from "./types";

// How many weighted tokens are chunked together per tx
const PUSH_TX_CHUNK_SIZE = 24;

// const CONSTRUCT_TX_CHUNK_SIZE = 24;
// const DECONSTRUCT_TX_CHUNK_SIZE = 24;

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
    prismEtfMint, // Mint of the corresponding PrismEtf SPL token
    weightedTokens, // Weighted tokens being pushed into the Prism ETF (may be empty)
  }: {
    beamsplitter: PublicKey;
    prismEtfMint: PublicKey;
    weightedTokens: WeightedToken[];
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
    for (let i = 0; i < weightedTokens.length; i += PUSH_TX_CHUNK_SIZE) {
      const weightedTokensChunk = weightedTokens.slice(
        i,
        i + PUSH_TX_CHUNK_SIZE
      );
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

  async _initOrderState({
    beamsplitter,
    prismEtfMint,
  }: {
    beamsplitter: PublicKey;
    prismEtfMint: PublicKey;
  }): Promise<TransactionEnvelope> {
    const transferredTokensKP = Keypair.generate();

    const initOrderStateEnvelope = await this._initTransferredTokens({
      transferredTokensKP,
    });

    const [orderStatePda, bump] = await generateOrderStateAddress(
      prismEtfMint,
      beamsplitter,
      this.provider.wallet.publicKey
    );

    initOrderStateEnvelope.addInstructions(
      this.program.instruction.initOrderState(bump, {
        accounts: {
          prismEtfMint: prismEtfMint,
          orderState: orderStatePda,
          orderer: this.provider.wallet.publicKey,
          transferredTokens: transferredTokensKP.publicKey,
          beamsplitter,
          systemProgram: SystemProgram.programId,
        },
      })
    );

    return initOrderStateEnvelope;
  }

  async startOrder({
    beamsplitter,
    prismEtfMint,
    isConstruction,
    amount,
  }: {
    beamsplitter: PublicKey;
    prismEtfMint: PublicKey;
    isConstruction: boolean;
    amount: BN;
  }): Promise<TransactionEnvelope> {
    let orderState = await this.fetchOrderStateDataFromSeeds({
      beamsplitter,
      prismEtfMint,
    });

    const initOrderStateEnvelope = new TransactionEnvelope(this.provider, []);

    if (!orderState) {
      initOrderStateEnvelope.combine(
        await this._initOrderState({
          beamsplitter,
          prismEtfMint,
        })
      );
    }
    orderState = orderState as OrderStateData;

    const prismEtf = await this.fetchPrismEtfDataFromSeeds({
      beamsplitter,
      prismEtfMint,
    });

    if (!prismEtf) {
      throw new Error("You must create the prismEtf first.");
    }

    const { address: transferredTokensAta, instruction: createATATx } =
      await getOrCreateATA({
        provider: this.provider,
        mint: prismEtfMint,
      });

    if (createATATx) {
      initOrderStateEnvelope.addInstructions(createATATx);
    }

    const [prismEtfPda] = await generatePrismEtfAddress(
      prismEtfMint,
      beamsplitter
    );

    const [orderStatePda] = await generateOrderStateAddress(
      prismEtfMint,
      beamsplitter,
      this.provider.wallet.publicKey
    );

    return initOrderStateEnvelope.addInstructions(
      this.program.instruction.startOrder(isConstruction, amount, {
        accounts: {
          prismEtf: prismEtfPda,
          prismEtfMint,
          orderState: orderStatePda,
          transferredTokens: orderState.transferredTokens,
          orderer: this.provider.wallet.publicKey,
          ordererEtfAta: transferredTokensAta,
          beamsplitter,
          rent: SYSVAR_RENT_PUBKEY,
          weightedTokens: prismEtf.weightedTokens,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        },
      })
    );
  }

  // async contruct({
  //   beamsplitter,
  //   prismEtfMint,
  // }: {
  //   beamsplitter: PublicKey;
  //   prismEtfMint: PublicKey;
  // }): Promise<TransactionEnvelope[]> {
  //   const orderState = await this.fetchOrderStateDataFromSeeds({
  //     beamsplitter,
  //     prismEtfMint,
  //   });

  //   if (!orderState) {
  //     throw new Error(
  //       "You must start an order first. Call startOrder() before construct."
  //     );
  //   }

  //   const prismEtf = await this.fetchPrismEtfDataFromSeeds({
  //     beamsplitter,
  //     prismEtfMint,
  //   });

  //   if (!prismEtf) {
  //     throw new Error("You must create the prismEtf first.");
  //   }

  //   const weightedTokensAcct = await this.fetchWeightedTokens(
  //     prismEtf.weightedTokens
  //   );

  //   if (!weightedTokensAcct) {
  //     throw new Error("Weighted tokens was not initalized.");
  //   }

  //   const weightedTokens: WeightedToken[] = weightedTokensAcct.weightedTokens;

  //   const [prismEtfPda] = await generatePrismEtfAddress(
  //     prismEtfMint,
  //     beamsplitter
  //   );

  //   const [orderStatePda] = await generateOrderStateAddress(
  //     prismEtfMint,
  //     beamsplitter,
  //     this.provider.wallet.publicKey
  //   );

  //   const constructTxChunks: TransactionEnvelope[] = [];
  //   for (let i = 0; i < weightedTokens.length; i++) {
  //     if (!weightedTokens.at(i)) {
  //       throw new Error("Outside weighted tokens array range");
  //     }

  //     const { instruction: createATATx } = await getOrCreateATA({
  //       provider: this.provider,
  //       mint: weightedTokens[i].mint,
  //       owner: beamsplitter,
  //     });

  //     if (createATATx) {
  //       initOrderStateEnvelope.addInstructions(createATATx);
  //     }

  //     const { address: transferredTokensAta, instruction: createATATx } =
  //       await getOrCreateATA({
  //         provider: this.provider,
  //         mint: weightedTokens[i].mint,
  //       });

  //     if (createATATx) {
  //       initOrderStateEnvelope.addInstructions(createATATx);
  //     }
  //     constructTxChunks.push(
  //       new TransactionEnvelope(this.provider, [
  //         this.program.instruction.construct(new BN(i), {
  //           accounts: {
  //             prismEtf: prismEtfPda,
  //             prismEtfMint,
  //             beamsplitter,
  //             weightedTokens: prismEtf.weightedTokens,
  //             manager: this.provider.wallet.publicKey,
  //             systemProgram: SystemProgram.programId,
  //           },
  //         }),
  //       ])
  //     );
  //   }

  //   return initOrderStateEnvelopes;
  // }

  async finalizeOrder({
    beamsplitter,
    prismEtfMint,
  }: {
    beamsplitter: PublicKey;
    prismEtfMint: PublicKey;
  }): Promise<TransactionEnvelope> {
    const orderState = await this.fetchOrderStateDataFromSeeds({
      beamsplitter,
      prismEtfMint,
    });

    const initOrderStateEnvelope = new TransactionEnvelope(this.provider, []);

    if (!orderState) {
      throw new Error("You must init the orderState first. Call startOrder()");
    }

    const prismEtf = await this.fetchPrismEtfDataFromSeeds({
      beamsplitter,
      prismEtfMint,
    });

    if (!prismEtf) {
      throw new Error(
        "You must create the prismEtf first. Call initPrismEtf()"
      );
    }

    const { address: transferredTokensAta, instruction: createATATx } =
      await getOrCreateATA({
        provider: this.provider,
        mint: prismEtfMint,
      });

    if (createATATx) {
      initOrderStateEnvelope.addInstructions(createATATx);
    }

    const [prismEtfPda] = await generatePrismEtfAddress(
      prismEtfMint,
      beamsplitter
    );

    const [orderStatePda] = await generateOrderStateAddress(
      prismEtfMint,
      beamsplitter,
      this.provider.wallet.publicKey
    );

    return initOrderStateEnvelope.addInstructions(
      this.program.instruction.finalizeOrder({
        accounts: {
          prismEtf: prismEtfPda,
          prismEtfMint,
          orderState: orderStatePda,
          transferredTokens: orderState.transferredTokens,
          orderer: this.provider.wallet.publicKey,
          ordererEtfAta: transferredTokensAta,
          beamsplitter,
          rent: SYSVAR_RENT_PUBKEY,
          weightedTokens: prismEtf.weightedTokens,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        },
      })
    );
  }

  async fetchOrderStateDataFromSeeds({
    beamsplitter,
    prismEtfMint,
    orderer = this.provider.wallet.publicKey,
  }: {
    beamsplitter: PublicKey;
    prismEtfMint: PublicKey;
    orderer?: PublicKey;
  }): Promise<OrderStateData | null> {
    const [orderState] = await generateOrderStateAddress(
      prismEtfMint,
      beamsplitter,
      orderer
    );
    return (await this.program.account.orderState.fetchNullable(
      orderState
    )) as OrderStateData;
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

  async fetchWeightedTokens(
    key: PublicKey
  ): Promise<WeightedTokensData | null> {
    return (await this.program.account.weightedTokens.fetchNullable(
      key
    )) as WeightedTokensData;
  }
}
