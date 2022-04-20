import { newProgram } from "@saberhq/anchor-contrib";
import type { AugmentedProvider, Provider } from "@saberhq/solana-contrib";
import {
  SolanaAugmentedProvider,
  TransactionEnvelope,
} from "@saberhq/solana-contrib";
import {
  getMintInfo as saberGetMintInfo,
  getOrCreateATA as saberGetOrCreateATA,
} from "@saberhq/token-utils";
import type {
  Connection,
  PublicKey,
  Signer,
  TransactionInstruction,
} from "@solana/web3.js";

import { IDL } from "./coherence_beamsplitter";
import { PROGRAM_ID } from "./constants";
import type {
  BeamsplitterData,
  BeamsplitterProgram,
  OrderStateData,
  PrismEtfData,
  TransferredTokensData,
  WeightedTokensData,
} from "./types";

export class CoherenceLoader {
  readonly provider: AugmentedProvider;
  readonly program: BeamsplitterProgram;

  constructor(saberProvider: Provider, signer?: Signer) {
    this.provider =
      signer !== undefined
        ? new SolanaAugmentedProvider(saberProvider).withSigner(signer)
        : new SolanaAugmentedProvider(saberProvider);
    this.program = newProgram<BeamsplitterProgram>(
      IDL,
      PROGRAM_ID,
      this.provider
    );
  }

  makeProviderEnvelope(
    instructions: TransactionInstruction[],
    signers?: Signer[]
  ): TransactionEnvelope {
    return new TransactionEnvelope(this.provider, instructions, signers);
  }

  getUserPublicKey(): PublicKey {
    return this.provider.wallet?.publicKey;
  }

  getConnection(): Connection {
    return this.provider.connection;
  }

  async getOrCreateATA({
    mint,
    owner = this.getUserPublicKey(),
    payer = this.getUserPublicKey(),
  }: {
    mint: PublicKey;
    owner?: PublicKey;
    payer?: PublicKey;
  }) {
    return saberGetOrCreateATA({
      provider: this.provider,
      mint,
      owner,
      payer,
    });
  }

  async getMintInfo({ mint }: { mint: PublicKey }) {
    return saberGetMintInfo(this.provider, mint);
  }

  async fetchBeamsplitterData(
    beamsplitterPda: PublicKey
  ): Promise<BeamsplitterData | null> {
    return (await this.getProgramAccounts().beamsplitter.fetchNullable(
      beamsplitterPda
    )) as BeamsplitterData;
  }

  async fetchPrismEtfData(
    prismEtfPda: PublicKey
  ): Promise<PrismEtfData | null> {
    return (await this.getProgramAccounts().prismEtf.fetchNullable(
      prismEtfPda
    )) as PrismEtfData;
  }

  async fetchWeightedTokensData(
    weightedTokensAcct: PublicKey
  ): Promise<WeightedTokensData | null> {
    return (await this.getProgramAccounts().weightedTokens.fetchNullable(
      weightedTokensAcct
    )) as WeightedTokensData;
  }

  async fetchOrderStateData(
    orderStatePda: PublicKey
  ): Promise<OrderStateData | null> {
    return (await this.getProgramAccounts().orderState.fetchNullable(
      orderStatePda
    )) as OrderStateData;
  }

  async fetchTransferredTokensData(
    transferredTokensAcct: PublicKey
  ): Promise<TransferredTokensData | null> {
    return (await this.getProgramAccounts().transferredTokens.fetchNullable(
      transferredTokensAcct
    )) as TransferredTokensData;
  }

  getProgramAccounts() {
    return this.program.account;
  }

  getProgramInstructions() {
    return this.program.instruction;
  }
}
