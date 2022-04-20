import type { Provider, TransactionEnvelope } from "@saberhq/solana-contrib";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getATAAddress,
  getMintInfo,
  TOKEN_PROGRAM_ID,
} from "@saberhq/token-utils";
import { Token, u64 } from "@solana/spl-token";
import type {
  PublicKey,
  Signer,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  Keypair,
  SystemProgram,
  SYSVAR_CLOCK_PUBKEY,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import BN from "bn.js";

import type { CoherenceBeamsplitter } from "./CoherenceBeamsplitter";
import { generateOrderStateAddress, generatePrismEtfAddress } from "./pda";
import type {
  BeamsplitterData,
  BeamsplitterProgram,
  OrderStateData,
  PrismEtfData,
  TransferredTokensData,
  WeightedTokensData,
} from "./types";
import {
  enumLikeToString,
  OrderType,
  stringToEnumLike,
  TRANSFERRED_TOKENS_SIZE,
} from "./types";

const fetchPrismEtfData = async (
  program: BeamsplitterProgram,
  prismEtfPda: PublicKey
): Promise<PrismEtfData | null> => {
  return (await program.account.prismEtf.fetchNullable(
    prismEtfPda
  )) as PrismEtfData;
};

const fetchWeightedTokensData = async (
  program: BeamsplitterProgram,
  weightedTokens: PublicKey
): Promise<WeightedTokensData | null> => {
  return (await program.account.weightedTokens.fetchNullable(
    weightedTokens
  )) as WeightedTokensData;
};

const fetchOrderStateData = async (
  program: BeamsplitterProgram,
  orderStatePda: PublicKey
): Promise<OrderStateData | null> => {
  return (await program.account.orderState.fetchNullable(
    orderStatePda
  )) as OrderStateData;
};

const fetchTransferredTokensData = async (
  program: BeamsplitterProgram,
  transferredTokensAcct: PublicKey
): Promise<TransferredTokensData | null> => {
  return (await program.account.transferredTokens.fetchNullable(
    transferredTokensAcct
  )) as TransferredTokensData;
};

export type MintToDecimal = { [key: string]: number };

const getDecimalsForMints = async (
  provider: Provider,
  mints: PublicKey[]
): Promise<MintToDecimal> => {
  const mintToDecimal: MintToDecimal = {};

  await Promise.all(
    mints.map(async (mint) => {
      mintToDecimal[mint.toString()] = (
        await getMintInfo(provider, mint)
      ).decimals;
    })
  );

  return mintToDecimal;
};

export class PrismEtf {
  transferredTokensAcct: PublicKey | undefined;

  constructor(
    readonly beamsplitter: CoherenceBeamsplitter,
    readonly prismEtfMint: PublicKey,
    readonly prismEtfPda: PublicKey,
    readonly prismEtfData: PrismEtfData | null,
    readonly weightedTokensData: WeightedTokensData | null,
    readonly orderStatePda: PublicKey,
    readonly orderStateBump: number,
    readonly orderStateData: OrderStateData | null,
    transferredTokensAcct: PublicKey | undefined,
    readonly transferredTokensData: TransferredTokensData | null,
    readonly mintToDecimal: MintToDecimal
  ) {
    this.transferredTokensAcct = transferredTokensAcct;
  }

  static async loadPrismEtf({
    beamsplitter,
    prismEtfMint,
  }: {
    readonly beamsplitter: CoherenceBeamsplitter;
    readonly prismEtfMint: PublicKey;
  }): Promise<PrismEtf> {
    const [prismEtfPda] = await generatePrismEtfAddress(
      prismEtfMint,
      beamsplitter.beamsplitter
    );
    const prismEtfData = await fetchPrismEtfData(
      beamsplitter.loader.program,
      prismEtfPda
    );
    const weightedTokensData =
      prismEtfData !== null
        ? await fetchWeightedTokensData(
            beamsplitter.loader.program,
            prismEtfData.weightedTokens
          )
        : null;

    const [orderStatePda, orderStateBump] = await generateOrderStateAddress(
      prismEtfMint,
      beamsplitter.beamsplitter,
      beamsplitter.loader.getUserPublicKey(),
      0
    );
    const orderStateData =
      prismEtfData !== null
        ? await fetchOrderStateData(beamsplitter.loader.program, orderStatePda)
        : null;
    const transferredTokensAcct = orderStateData?.transferredTokens;
    const transferredTokensData =
      transferredTokensAcct !== undefined
        ? await fetchTransferredTokensData(
            beamsplitter.loader.program,
            transferredTokensAcct
          )
        : null;
    const mintToDecimal = await getDecimalsForMints(
      beamsplitter.loader.provider,
      [
        ...(weightedTokensData?.weightedTokens
          .slice(0, weightedTokensData?.length ?? 0)
          .map((t) => t.mint) ?? []),
        prismEtfMint,
      ]
    );

    return new PrismEtf(
      beamsplitter,
      prismEtfMint,
      prismEtfPda,
      prismEtfData,
      weightedTokensData,
      orderStatePda,
      orderStateBump,
      orderStateData,
      transferredTokensAcct,
      transferredTokensData,
      mintToDecimal
    );
  }

  async initTransferredTokens({
    transferredTokensKP = Keypair.generate(),
  }: {
    transferredTokensKP?: Keypair;
  }): Promise<TransactionEnvelope> {
    const transferredTokensTx =
      await this.getProgramAccounts().weightedTokens.createInstruction(
        transferredTokensKP,
        TRANSFERRED_TOKENS_SIZE
      );

    return this.makeProviderEnvelope(
      [
        transferredTokensTx,
        this.getProgramInstructions().initTransferredTokens({
          accounts: {
            transferredTokens: transferredTokensKP.publicKey,
          },
        }),
      ],
      [transferredTokensKP]
    );
  }

  async initOrderState(): Promise<TransactionEnvelope> {
    const transferredTokensKP = Keypair.generate();

    const initOrderStateEnvelope = await this.initTransferredTokens({
      transferredTokensKP,
    });

    if (this.prismEtfData === null) {
      throw new Error(
        "prismEtfMint does not correspond to valid prismEtf account"
      );
    }

    this.transferredTokensAcct = transferredTokensKP.publicKey;

    initOrderStateEnvelope.append(
      this.getProgramInstructions().initOrderState(this.orderStateBump, 0, {
        accounts: {
          prismEtfMint: this.prismEtfMint,
          prismEtf: this.prismEtfPda,
          orderState: this.orderStatePda,
          orderer: this.getUserPublicKey(),
          transferredTokens: this.transferredTokensAcct,
          beamsplitter: this.getBeamsplitter(),
          systemProgram: SystemProgram.programId,
        },
      })
    );

    return initOrderStateEnvelope;
  }

  async startOrder({
    type,
    amount,
    shouldCreateAtas = true,
  }: {
    type: OrderType;
    amount: BN;
    shouldCreateAtas?: boolean;
  }): Promise<TransactionEnvelope> {
    const initOrderStateEnvelope = this.makeProviderEnvelope([]);

    if (this.prismEtfData === null) {
      throw new Error("You must create the prismEtf first.");
    }

    if (this.transferredTokensAcct === undefined) {
      throw new Error("Transferred tokens was not initalized.");
    }

    const { address: ordererEtfAta, instruction: createATATx } =
      await this.getOrCreateATA({
        mint: this.prismEtfMint,
      });

    if (shouldCreateAtas && createATATx) {
      initOrderStateEnvelope.append(createATATx);
    }

    initOrderStateEnvelope.append(
      this.getProgramInstructions().startOrder(stringToEnumLike(type), amount, {
        accounts: {
          prismEtf: this.prismEtfPda,
          prismEtfMint: this.prismEtfMint,
          orderState: this.orderStatePda,
          transferredTokens: this.transferredTokensAcct,
          orderer: this.getUserPublicKey(),
          ordererEtfAta,
          beamsplitter: this.getBeamsplitter(),
          rent: SYSVAR_RENT_PUBKEY,
          clock: SYSVAR_CLOCK_PUBKEY,
          weightedTokens: this.prismEtfData.weightedTokens,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        },
      })
    );

    return initOrderStateEnvelope;
  }

  async cohere({
    orderStateAmount,
    shouldCreateAtas = true, // If false, the instruction doesn't setup Ata's for you (careful with this, it may fail if you don't do it)
  }: {
    orderStateAmount: BN;
    shouldCreateAtas?: boolean;
  }): Promise<TransactionEnvelope[]> {
    if (this.prismEtfData === null) {
      throw new Error("You must create the prismEtf first.");
    }

    if (this.weightedTokensData === null) {
      throw new Error("Weighted tokens was not initalized.");
    }

    if (this.transferredTokensAcct === undefined) {
      throw new Error("Transferred tokens was not initalized.");
    }

    const { weightedTokens, length } = this.weightedTokensData;
    const constructTxChunks: TransactionEnvelope[] = [];

    for (let i = 0; i < length; i++) {
      const constructEnvelope = this.makeProviderEnvelope([]);

      if (weightedTokens.at(i) === undefined) {
        throw new Error("Outside weighted tokens array range");
      }

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const { mint, weight } = weightedTokens[i]!;

      const prismEtfTransferAta = await getATAAddress({
        mint,
        owner: this.prismEtfPda,
      });

      const { address: ordererTransferAta, instruction: createOrdererAta } =
        await this.getOrCreateATA({
          mint,
        });

      if (shouldCreateAtas && createOrdererAta !== null) {
        constructEnvelope.append(createOrdererAta);
      }

      const approvedAmount = orderStateAmount
        .mul(new BN(weight))
        .div(new BN(10 ** this.getDecimals()))
        .add(new BN(1));

      constructEnvelope.append(
        Token.createApproveInstruction(
          TOKEN_PROGRAM_ID,
          ordererTransferAta,
          prismEtfTransferAta,
          this.getUserPublicKey(),
          [],
          new u64(approvedAmount.toArrayLike(Buffer))
        )
      );

      constructTxChunks.push(
        constructEnvelope.append(
          this.getProgramInstructions().cohere(i, {
            accounts: {
              prismEtfMint: this.prismEtfMint,
              prismEtf: this.prismEtfPda,
              orderState: this.orderStatePda,
              weightedTokens: this.prismEtfData.weightedTokens,
              transferredTokens: this.transferredTokensAcct,
              orderer: this.getUserPublicKey(),
              transferMint: mint,
              ordererTransferAta,
              beamsplitterTransferAta: prismEtfTransferAta,
              beamsplitter: this.getBeamsplitter(),
              rent: SYSVAR_RENT_PUBKEY,
              clock: SYSVAR_CLOCK_PUBKEY,
              associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
              tokenProgram: TOKEN_PROGRAM_ID,
              systemProgram: SystemProgram.programId,
            },
          })
        )
      );
    }

    return constructTxChunks;
  }

  async decohere({
    shouldCreateAtas = true, // If false, the instruction doesn't setup Ata's for you (careful with this, it may fail if you don't do it)
  }: {
    shouldCreateAtas?: boolean;
  }): Promise<TransactionEnvelope[]> {
    if (this.prismEtfData === null) {
      throw new Error("You must create the prismEtf first.");
    }

    if (this.weightedTokensData === null) {
      throw new Error("Weighted tokens was not initalized.");
    }

    if (this.transferredTokensAcct === undefined) {
      throw new Error("Transferred tokens was not initalized.");
    }

    const { weightedTokens, length } = this.weightedTokensData;
    const constructTxChunks: TransactionEnvelope[] = [];

    for (let i = 0; i < length; i++) {
      const constructEnvelope = this.makeProviderEnvelope([]);

      if (weightedTokens.at(i) === undefined) {
        throw new Error("Outside weighted tokens array range");
      }

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const { mint } = weightedTokens[i]!;

      const prismEtfTransferAta = await getATAAddress({
        mint,
        owner: this.prismEtfPda,
      });

      const { address: ordererTransferAta, instruction: createOrdererAta } =
        await this.getOrCreateATA({
          mint,
        });

      if (shouldCreateAtas && createOrdererAta !== null) {
        constructEnvelope.append(createOrdererAta);
      }

      constructTxChunks.push(
        constructEnvelope.append(
          this.getProgramInstructions().decohere(i, {
            accounts: {
              prismEtfMint: this.prismEtfMint,
              prismEtf: this.prismEtfPda,
              orderState: this.orderStatePda,
              weightedTokens: this.prismEtfData.weightedTokens,
              transferredTokens: this.transferredTokensAcct,
              orderer: this.getUserPublicKey(),
              transferMint: mint,
              ordererTransferAta,
              beamsplitterTransferAta: prismEtfTransferAta,
              beamsplitter: this.getBeamsplitter(),
              rent: SYSVAR_RENT_PUBKEY,
              clock: SYSVAR_CLOCK_PUBKEY,
              associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
              tokenProgram: TOKEN_PROGRAM_ID,
              systemProgram: SystemProgram.programId,
            },
          })
        )
      );
    }

    return constructTxChunks;
  }

  async finalizeOrder({
    shouldCreateAtas = true, // If false, the instruction doesn't setup Ata's for you (careful with this, it may fail if you don't do it)
  }: {
    shouldCreateAtas?: boolean;
  }): Promise<TransactionEnvelope> {
    const resultEnvelope = this.makeProviderEnvelope([]);

    if (this.prismEtfData === null) {
      throw new Error("You must create the prismEtf first.");
    }

    const beamsplitterData = this.getBeamsplitterData();

    if (beamsplitterData === null) {
      throw new Error(
        "You must create the beamsplitter first. Call initialize()"
      );
    }

    if (this.transferredTokensAcct === undefined) {
      throw new Error("Transferred tokens was not initalized.");
    }

    const beamsplitterOwner = beamsplitterData.owner;

    const { address: ownerEtfAta, instruction: createOwnerAtaTx } =
      await this.getOrCreateATA({
        mint: this.prismEtfMint,
        owner: beamsplitterOwner,
      });

    if (
      shouldCreateAtas &&
      createOwnerAtaTx !== null &&
      !beamsplitterOwner.equals(this.getUserPublicKey())
    ) {
      resultEnvelope.append(createOwnerAtaTx);
    }

    const { address: managerEtfAta, instruction: createManagerEtfAtaTx } =
      await this.getOrCreateATA({
        mint: this.prismEtfMint,
        owner: this.prismEtfData.manager,
      });

    if (
      shouldCreateAtas &&
      createManagerEtfAtaTx !== null &&
      !this.prismEtfData.manager.equals(this.getUserPublicKey()) &&
      !beamsplitterOwner.equals(this.prismEtfData.manager)
    ) {
      resultEnvelope.append(createManagerEtfAtaTx);
    }

    const transferredTokensAta = await getATAAddress({
      mint: this.prismEtfMint,
      owner: this.getUserPublicKey(),
    });

    resultEnvelope.append(
      this.getProgramInstructions().finalizeOrder({
        accounts: {
          prismEtf: this.prismEtfPda,
          prismEtfMint: this.prismEtfMint,
          orderState: this.orderStatePda,
          transferredTokens: this.transferredTokensAcct,
          orderer: this.getUserPublicKey(),
          ordererEtfAta: transferredTokensAta,
          owner: beamsplitterOwner,
          ownerEtfAta,
          manager: this.prismEtfData.manager,
          managerEtfAta,
          beamsplitter: this.getBeamsplitter(),
          rent: SYSVAR_RENT_PUBKEY,
          weightedTokens: this.prismEtfData.weightedTokens,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        },
      })
    );

    return resultEnvelope;
  }

  // Cancel pending order
  async cancel(): Promise<TransactionEnvelope[]> {
    if (this.orderStateData === null) {
      throw new Error("Order state must be intialized");
    }

    if (this.transferredTokensData === null) {
      throw new Error("Transferred Tokens does not exist");
    }

    const orderType = enumLikeToString(this.orderStateData.orderType);
    const intermediateTxChunks: TransactionEnvelope[] = await (orderType ===
    OrderType.CONSTRUCTION
      ? this.decohere({})
      : this.cohere({ orderStateAmount: this.orderStateData.amount }));

    const transferredTokens = this.transferredTokensData.transferredTokens;

    // Filter out any uncompleted cohere's / decohere's (this do not need to be cancelled)
    return intermediateTxChunks.filter(
      (_chunk, idx) =>
        (orderType === OrderType.CONSTRUCTION && transferredTokens[idx]) ||
        (orderType === OrderType.DECONSTRUCTION && !transferredTokens[idx])
    );
  }

  closePrismEtf(): [TransactionEnvelope[], TransactionEnvelope] {
    if (this.prismEtfData === null) {
      throw new Error("PrismEtf not intialized");
    }

    const envelope = this.makeProviderEnvelope([]);

    1

    envelope.append(
      this.getProgramInstructions().closePrismEtf({
        accounts: {
          manager: this.getUserPublicKey(),
          prismEtf: this.prismEtfPda,
          weightedTokens: this.prismEtfData.weightedTokens,
          prismEtfMint: this.prismEtfMint,
          beamsplitter: this.getBeamsplitter(),
          systemProgram: SystemProgram.programId,
        },
      })
    );

    return envelope.partition();
  }

  closeOrderState(): TransactionEnvelope {
    if (this.transferredTokensAcct === undefined) {
      throw new Error("Transferred tokens was not initaliazed.");
    }

    return this.makeProviderEnvelope([
      this.getProgramInstructions().closeOrderState({
        accounts: {
          transferredTokens: this.transferredTokensAcct,
          prismEtfMint: this.prismEtfMint,
          orderer: this.getUserPublicKey(),
          prismEtf: this.prismEtfPda,
          orderState: this.orderStatePda,
          beamsplitter: this.getBeamsplitter(),
          systemProgram: SystemProgram.programId,
        },
      }),
    ]);
  }

  setManager({ newManager }: { newManager: PublicKey }): TransactionEnvelope {
    return this.makeProviderEnvelope([
      this.getProgramInstructions().setManager({
        accounts: {
          prismEtfMint: this.prismEtfMint,
          prismEtf: this.prismEtfPda,
          manager: this.getUserPublicKey(),
          newManager,
          beamsplitter: this.getBeamsplitter(),
        },
      }),
    ]);
  }

  getBeamsplitter(): PublicKey {
    return this.beamsplitter.beamsplitter;
  }

  getBeamsplitterData(): BeamsplitterData | null {
    return this.beamsplitter.beamsplitterData;
  }

  getProgramAccounts() {
    return this.beamsplitter.loader.program.account;
  }

  getProgramInstructions() {
    return this.beamsplitter.loader.program.instruction;
  }

  makeProviderEnvelope(
    instructions: TransactionInstruction[],
    signers?: Signer[]
  ): TransactionEnvelope {
    return this.beamsplitter.loader.makeProviderEnvelope(instructions, signers);
  }

  getUserPublicKey(): PublicKey {
    return this.beamsplitter.loader.getUserPublicKey();
  }

  async getOrCreateATA(props: {
    mint: PublicKey;
    owner?: PublicKey;
    payer?: PublicKey;
  }) {
    return this.beamsplitter.loader.getOrCreateATA(props);
  }

  getDecimals(): number {
    return this.mintToDecimal[this.prismEtfMint.toString()] as number;
  }
}