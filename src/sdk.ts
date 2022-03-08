/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Market } from "@project-serum/serum";
import { approve } from "@project-serum/serum/lib/token-instructions";
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
  getATAAddress,
  getMintInfo,
  getOrCreateATA,
  TOKEN_PROGRAM_ID,
} from "@saberhq/token-utils";
import type { u64 } from "@solana/spl-token";
import { ASSOCIATED_TOKEN_PROGRAM_ID, Token } from "@solana/spl-token";
import type { Connection, Signer } from "@solana/web3.js";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import type BN from "bn.js";

import { IDL } from "../target/types/coherence_beamsplitter";
import type { WeightedToken } from ".";
import { getUSDCMint } from ".";
import { PROGRAM_ID } from "./constants";
import { generateBeamsplitterAddress, generatePrismEtfAddress } from "./pda";
import type {
  BeamsplitterData,
  BeamsplitterProgram,
  PrismEtfData,
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

    return new TransactionEnvelope(this.provider, [
      transferredTokensTx,
      this.program.instruction.initTransferredTokens({
        accounts: {
          transferredTokens: transferredTokensKP.publicKey,
        },
      }),
    ]);
  }

  async _initPrismEtf({
    beamsplitter,
    mintKP = Keypair.generate(),
    weightedTokensKP = Keypair.generate(),
    authority = this.provider.wallet.publicKey,
  }: {
    beamsplitter: PublicKey;
    weightedTokensKP?: K
    authority?: PublicKey;
    mintKP?: Keypair;
  }): Promise<TransactionEnvelope> {
    const initWeightedTokensEnvelope = await this._initWeightedTokens({weightedTokensKP});

    const initMintTx = await createInitMintInstructions({
      provider: this.provider,
      mintKP,
      decimals: 9,
      mintAuthority: authority,
    });

    const [prismEtfPda, bump] = await generatePrismEtfAddress(mintKP.publicKey, beamsplitter);
    const initPrismEtfTx = this.program.instruction.initPrismEtf(bump, {
      accounts: {
        prismEtf: prismEtfPda,
        prismEtfMint: mintKP.publicKey,
        weightedTokens: weightedTokensKP.publicKey,
        manager: this.provider.wallet.publicKey,
        beamsplitter: beamsplitter,
        systemProgram: SystemProgram.programId,
      },
    });

    const initPrismEtfEnvelope = initWeightedTokensEnvelope.combine(initMintTx);

    return initPrismEtfEnvelope.addInstructions(initPrismEtfTx);
  }

  // TODO: Pass multisig in so we can use it as authority for ATA
  async registerPrismEtf({
    beamsplitter,
    weightedTokens,
    mintKP = Keypair.generate(),
    authority = this.provider.wallet.publicKey,
    authorityKp,
    prismEtfKP,
    initialSupply,
  }: {
    beamsplitter: PublicKey;
    weightedTokens: WeightedToken[];
    mintKP?: Keypair;
    authority?: PublicKey;
    prismEtfKP: Keypair;
    authorityKp: Keypair;
    // TODO: Remove later. Here to reduce testing redundancy
    initialSupply?: u64;
  }): Promise<TransactionEnvelope> {
    ]);

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

    //const prismEtfKP = Keypair.generate();
    const bump = 9;
    const initBeamsplitterAndCreateAtaTx = new TransactionEnvelope(
      this.provider,
      [
        await this.program.account.prismEtf.createInstruction(
          prismEtfKP,
          589928 + 8 // use size_of on PrismEtf to get this value (8 is reserved for disscriminator)
        ),
        this.program.instruction.registerToken(bump, weightedTokens, {
          accounts: {
            beamsplitter,
            prismEtf: prismEtfKP.publicKey,
            adminAuthority: authority,
            tokenMint: mintKP.publicKey,
            systemProgram: SystemProgram.programId,
          },
        }),
        ...(ataInstruction ? [ataInstruction] : []),
      ],
      [prismEtfKP]
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

    //et tx = createLargeAcct.combine(initMintTX);
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

  async buy({
    beamsplitter,
    toToken,
    prismEtf,
    paymentMint = getUSDCMint(),
    amount,
  }: {
    beamsplitter: PublicKey;
    toToken?: PublicKey;
    prismEtf: PublicKey;
    paymentMint?: PublicKey;
    amount: BN;
  }): Promise<TransactionEnvelope> {
    const prismEtfAccount = await this.fetchPrismEtfData(prismEtf);
    let prismEtfMint;
    if (!(prismEtfMint = prismEtfAccount?.mint))
      throw new Error("Failed to fetch PrismEtf mint");

    // user's recieving account for basket tokens
    if (!toToken) {
      toToken = await getATAAddress({
        mint: prismEtfMint,
        owner: this.provider.wallet.publicKey,
      });
    }

    // user's token account used for payment
    const fromToken = await getATAAddress({
      mint: paymentMint,
      owner: this.provider.wallet.publicKey,
    });

    // where user sends payment
    const depositToken = await getATAAddress({
      mint: paymentMint,
      owner: beamsplitter,
    });

    // Approve transfer of [amount] tokens out of user token account
    const approveInst = approve({
      owner: this.provider.wallet.publicKey,
      delegate: beamsplitter,
      source: fromToken,
      amount,
    });

    const approveTx = new TransactionEnvelope(this.provider, [approveInst]);

    const usdcAuthority = (await getMintInfo(this.provider, getUSDCMint()))
      .mintAuthority;
    if (!usdcAuthority)
      throw new Error("Failed to retrieve USDC mint authority");

    const buyTx = new TransactionEnvelope(this.provider, [
      this.program.instruction.buy("" as never, {
        accounts: {
          usdcTokenAuthority: usdcAuthority,
          prismEtfMint: prismEtfMint,
          prismEtf: prismEtf,
          buyer: this.provider.wallet.publicKey,
          buyerToken: fromToken,
          recieverToken: toToken,
          beamsplitter,
          beamsplitterToken: depositToken,
          systemProgram: SystemProgram.programId,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
        },
      }),
    ]);

    return approveTx.combine(buyTx);
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
