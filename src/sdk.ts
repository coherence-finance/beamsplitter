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
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createInitMintInstructions,
  createMintToInstruction,
  getATAAddress,
  getOrCreateATA,
  TOKEN_PROGRAM_ID,
} from "@saberhq/token-utils";
import type { u64 } from "@solana/spl-token";
import { Token } from "@solana/spl-token";
import type { Connection, Signer } from "@solana/web3.js";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
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
    const aug = new SolanaAugmentedProvider(provider).withSigner(signer);
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

  // TODO: Pass multisig in so we can use it as authority for ATA
  async registerToken({
    prism,
    mintKP = Keypair.generate(),
    authority = this.provider.wallet.publicKey,
    authorityKp,
    initialSupply,
    assets,
  }: {
    prism: PublicKey;
    mintKP?: Keypair;
    authority?: PublicKey;
    authorityKp: Keypair;
    // TODO: Remove later. Here to reduce testing redundancy
    initialSupply?: u64;
    assets: AssetData[];
  }): Promise<TransactionEnvelope> {
    const [prismTokenKey, bump] = await generatePrismTokenAddress(
      mintKP.publicKey
    );

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
        owner: prism,
      });

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

    const setAuthTx = new TransactionEnvelope(
      this.provider,
      [
        Token.createSetAuthorityInstruction(
          TOKEN_PROGRAM_ID,
          mintKP.publicKey,
          prism,
          "MintTokens",
          authority,
          []
        ),
      ],
      [authorityKp]
    );

    let tx = initMintTX.combine(initPrismAndCreateAtaTx);

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
    prism,
    fromPrism,
    toPrism,
    amount,
  }: {
    prism: PublicKey;
    fromPrism: PublicKey;
    toPrism: PublicKey;
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

    const fromTokenAccount = await getATAAddress({
      mint: fromPrismAccount.mint,
      owner: prism,
    });
    const toTokenAccount = await getATAAddress({
      mint: toPrismAccount.mint,
      owner: prism,
    });

    const convertTx = new TransactionEnvelope(this.provider, [
      this.program.instruction.convert(amount, {
        accounts: {
          prism,
          from: fromTokenAccount,
          fromToken: fromPrism,
          fromMint: fromPrismAccount.mint,
          to: toTokenAccount,
          toToken: toPrism,
          toMint: toPrismAccount.mint,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        },
      }),
    ]);
    return convertTx;
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

  // Fetch the main Prism state account
  async fetchPrismData(key: PublicKey): Promise<PrismData | null> {
    return (await this.program.account.prism.fetchNullable(key)) as PrismData;
  }

  async fetchPrismTokenData(key: PublicKey): Promise<PrismTokenData | null> {
    return (await this.program.account.prismToken.fetchNullable(
      key
    )) as PrismTokenData;
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
