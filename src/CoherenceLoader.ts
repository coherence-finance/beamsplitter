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
import type { BeamsplitterProgram } from "./types";

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
    return this.provider.walletKey;
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
}
