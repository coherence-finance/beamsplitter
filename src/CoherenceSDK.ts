import type { Provider, TransactionEnvelope } from "@saberhq/solana-contrib";
import { getATAAddress } from "@saberhq/token-utils";
import type { Signer } from "@solana/web3.js";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import base58 from "bs58";

import type { AssetSource, SourceProps } from "./AssetSource";
import { JupiterSource } from "./AssetSource";
import type { UserPrismEtf, UserPrismEtfPostBody } from "./CoherenceApi";
import { addNewEtf, deleteEtf, getAllEtfs, getEtf } from "./CoherenceApi";
import { CoherenceBeamsplitter } from "./CoherenceBeamsplitter";
import type {
  TxCallback,
  TxCallbacks,
  UnsignedTxData,
} from "./CoherenceClient";
import { CoherenceClient } from "./CoherenceClient";
import { CoherenceLoader } from "./CoherenceLoader";
import { generatePrismEtfAddress } from "./pda";
import { PrismEtf } from "./PrismEtf";
import { TxTag } from "./TxTag";
import type { WeightedToken } from "./types";
import { OrderStatus, OrderType } from "./types";
import {
  combineAndPartitionEnvelopes,
  delay,
  getDecimalValue,
  getNativeBalance,
  getNativeValue,
} from "./utils";

export const makeEtfFinalizedKey = (mint: PublicKey) => {
  return `${TxTag.orderPrismEtfFinalized}-${mint.toString()}`;
};

export const extractFinalizedEtfMint = (tag: string) => {
  // Length of TxTag + "-"
  if (!tag.startsWith(TxTag.orderPrismEtfFinalized)) return undefined;
  return new PublicKey(tag.slice(TxTag.orderPrismEtfFinalized.length + 1));
};

export class CoherenceSDK extends CoherenceClient {
  beamsplitter: CoherenceBeamsplitter;
  assetSource: AssetSource;
  etfPreBalance: number;
  etfPostBalance: number;

  constructor(
    loader: CoherenceLoader,
    beamsplitter: CoherenceBeamsplitter,
    timeout: number,
    assetSource: AssetSource,
    _postSendTxCallback?: TxCallback,
    _finishedTxCallback?: TxCallback
  ) {
    const postSendTxCallback: TxCallback = async ({ tag, txid }) => {
      const mint = extractFinalizedEtfMint(tag);
      if (mint === undefined) return;

      const tokenAccount = await getATAAddress({
        mint,
        owner: loader.provider.walletKey,
      });
      this.etfPreBalance = await getNativeBalance(
        loader.provider.connection,
        tokenAccount
      );

      await _postSendTxCallback?.({ tag, txid });
    };

    const finishedTxCallback: TxCallback = async ({ tag, txid }) => {
      const mint = extractFinalizedEtfMint(tag);
      if (mint === undefined) return;

      const tokenAccount = await getATAAddress({
        mint,
        owner: loader.provider.walletKey,
      });

      let i = 0;
      const maxTries = 10;
      let postBalance = this.etfPreBalance;
      while (i < maxTries && this.etfPreBalance === postBalance) {
        postBalance = Number(
          (await getNativeBalance(loader.provider.connection, tokenAccount)) ||
            this.etfPreBalance
        );
        await delay(500);
        i += 1;
      }

      if (i >= maxTries) return;

      this.etfPostBalance = postBalance;

      await _finishedTxCallback?.({ tag, txid });
    };

    super(loader, timeout, postSendTxCallback, finishedTxCallback);

    this.assetSource = assetSource;
    this.beamsplitter = beamsplitter;
    this.etfPreBalance = 0;
    this.etfPostBalance = 0;
  }

  static async init({
    provider,
    timeout = 60000,
    assetSource,
    postSendTxCallback,
    finishedTxCallback,
  }: {
    provider: Provider;
    timeout?: number;
    assetSource?: AssetSource;
    postSendTxCallback?: TxCallback;
    finishedTxCallback?: TxCallback;
  }): Promise<CoherenceSDK> {
    const loader = new CoherenceLoader(provider);
    const beamsplitter = await CoherenceBeamsplitter.loadBeamsplitter({
      loader,
    });

    return new CoherenceSDK(
      loader,
      beamsplitter,
      timeout,
      assetSource || new JupiterSource(loader, timeout),
      postSendTxCallback,
      finishedTxCallback
    );
  }

  static async initWithSigner({
    provider,
    signer,
    timeout = 60000,
    assetSource,
    postSendTxCallback,
    finishedTxCallback,
  }: {
    provider: Provider;
    signer: Signer;
    timeout?: number;
    assetSource?: AssetSource;
    postSendTxCallback?: TxCallback;
    finishedTxCallback?: TxCallback;
  }): Promise<CoherenceSDK> {
    const loader = new CoherenceLoader(provider, signer);
    const beamsplitter = await CoherenceBeamsplitter.loadBeamsplitter({
      loader,
    });

    return new CoherenceSDK(
      loader,
      beamsplitter,
      timeout,
      assetSource || new JupiterSource(loader, timeout),
      postSendTxCallback,
      finishedTxCallback
    );
  }

  async refreshBeamsplitter() {
    this.beamsplitter = await CoherenceBeamsplitter.loadBeamsplitter({
      loader: this.loader,
    });
  }

  async loadPrismEtf(prismEtfMint: PublicKey, userPrismEtf: UserPrismEtf) {
    return await PrismEtf.loadPrismEtf({
      beamsplitter: this.beamsplitter,
      prismEtfMint,
      userPrismEtf,
    });
  }

  // Create ETF
  async createAndListEtf({
    tokens,
    listingMessage,
    signMessage,
    name,
    symbol,
    ...rest
  }: {
    tokens: WeightedToken[];
    listingMessage?: string;
    signMessage: (s: Uint8Array) => Promise<Uint8Array>;
    name: string;
    symbol: string;
  } & TxCallbacks): Promise<PublicKey> {
    const prismEtfMint = await this.createPrismEtf({ tokens, ...rest });
    await this.listPrismEtf({
      prismEtfMint,
      listingMessage,
      signMessage,
      name,
      symbol,
      targetAllocations: tokens.map(({ mint, weight }) => {
        return { mint: mint.toString(), target: weight.toNumber() };
      }),
      ...rest,
    });
    return prismEtfMint;
  }

  async createPrismEtf({
    tokens,
    ...rest
  }: {
    tokens: WeightedToken[];
  } & TxCallbacks): Promise<PublicKey> {
    const [initPrismEtfTx, prismEtfMint, prismEtfPda, weightedTokensAcct] =
      await this.beamsplitter.initPrismEtf({});

    const pushTokensEnvelopes = await this.beamsplitter.pushTokens({
      prismEtfMint,
      prismEtfPda,
      weightedTokens: tokens,
      weightedTokensAcct,
    });

    const finalizePrismEtfTx = await this.beamsplitter.finalizePrismEtf({
      prismEtfMint,
      prismEtfPda,
    });

    const partitionedEnvelopes = combineAndPartitionEnvelopes([
      initPrismEtfTx,
      ...pushTokensEnvelopes,
      finalizePrismEtfTx,
    ]);

    const unsignedTxsArr: UnsignedTxData[][] =
      partitionedEnvelopes.length === 1
        ? [
            partitionedEnvelopes.map((env) => {
              return {
                data: env,
                tag: TxTag.createPrismEtfFinalized,
              };
            }),
          ]
        : [
            partitionedEnvelopes.slice(0, -1).map((env, i) => {
              return {
                data: env,
                tag: `${TxTag.createPrismEtfPushTokens}-${i}`,
                groupTag: TxTag.createPrismEtfPushTokens,
              };
            }),
            partitionedEnvelopes.slice(-1).map((env) => {
              return {
                data: env,
                tag: TxTag.createPrismEtfFinalized,
              };
            }),
          ];

    await this.signAndSendTransactions({
      unsignedTxsArr,
      ...rest,
    });

    return prismEtfMint;
  }

  async listPrismEtf({
    prismEtfMint,
    listingMessage = "List ETF on Coherence",
    signMessage,
    name,
    symbol,
    targetAllocations,
    postSendTxCallback,
    finishedTxCallback,
  }: {
    prismEtfMint: PublicKey;
    listingMessage?: string;
    signMessage: (s: Uint8Array) => Promise<Uint8Array>;
    name: string;
    symbol: string;
    targetAllocations: UserPrismEtfPostBody["targetAllocations"];
  } & TxCallbacks) {
    const message = new TextEncoder().encode(listingMessage);
    const signature = await signMessage(message);

    const etfBody: UserPrismEtfPostBody = {
      nonce: base58.encode(signature),
      mint: prismEtfMint.toString(),
      name,
      symbol,
      targetAllocations,
    };

    await Promise.all([
      postSendTxCallback?.({
        tag: TxTag.listPrismEtf,
        txid: signature.toString(),
      }),
      this.postSendTxCallback?.({
        tag: TxTag.listPrismEtf,
        txid: signature.toString(),
      }),
    ]);

    await addNewEtf(etfBody);

    await Promise.all([
      finishedTxCallback?.({
        tag: TxTag.listPrismEtf,
        txid: signature.toString(),
      }),
      this.finishedTxCallback?.({
        tag: TxTag.listPrismEtf,
        txid: signature.toString(),
      }),
    ]);
  }

  // Delete ETF
  async deleteAndUnlistEtf({
    prismEtf,
    ...rest
  }: {
    prismEtf: PrismEtf;
  } & TxCallbacks): Promise<void> {
    await this.deletePrismEtf({ prismEtf, ...rest });
    await this.unlistPrismEtf({ prismEtfMint: prismEtf.prismEtfMint, ...rest });
  }

  async deletePrismEtf({
    prismEtf,
    ...rest
  }: { prismEtf: PrismEtf } & TxCallbacks) {
    await this.signAndSendTransactions({
      unsignedTxsArr: [
        [
          {
            data: prismEtf.closePrismEtf(),
            tag: TxTag.deletePrismEtf,
          },
        ],
      ],
      ...rest,
    });
  }

  async unlistPrismEtf({
    prismEtfMint,
    postSendTxCallback,
    finishedTxCallback,
  }: { prismEtfMint: PublicKey } & TxCallbacks) {
    await Promise.all([
      postSendTxCallback?.({
        tag: TxTag.unlistPrismEtf,
        txid: "",
      }),
      this.postSendTxCallback?.({
        tag: TxTag.unlistPrismEtf,
        txid: "",
      }),
    ]);

    await deleteEtf(prismEtfMint.toString());

    await Promise.all([
      finishedTxCallback?.({
        tag: TxTag.unlistPrismEtf,
        txid: "",
      }),
      this.finishedTxCallback?.({
        tag: TxTag.unlistPrismEtf,
        txid: "",
      }),
    ]);
  }

  // Buy/sell ETF
  async buyEtf({
    inputNativeAmount,
    inputMint,
    assetSource,
    prismEtf,
    slippage,
    ...rest
  }: {
    inputNativeAmount: number;
    inputMint: PublicKey;
    assetSource?: AssetSource;
    prismEtf: PrismEtf;
    slippage: number;
  } & TxCallbacks) {
    const etfNativeAmount = await this.sourceInUnderlyingAssets({
      inputNativeAmount,
      inputMint,
      assetSource: assetSource || this.assetSource,
      prismEtf,
      slippage,
      ...rest,
    });
    await this.executeOrder({
      nativeAmount: etfNativeAmount,
      type: OrderType.CONSTRUCTION,
      prismEtf,
      ...rest,
    });

    const boughtEtfNativeAmount = this.etfPostBalance - this.etfPreBalance;

    return boughtEtfNativeAmount;
  }

  async sellEtf({
    nativeAmount,
    outputMint,
    assetSource,
    prismEtf,
    slippage,
    ...rest
  }: {
    nativeAmount: number;
    outputMint: PublicKey;
    assetSource?: AssetSource;
    prismEtf: PrismEtf;
    slippage: number;
  } & TxCallbacks) {
    await this.executeOrder({
      nativeAmount: new BN(nativeAmount),
      type: OrderType.DECONSTRUCTION,
      prismEtf,
      ...rest,
    });
    const outputNativeAmount = await this.sourceOutUnderlyingAssets({
      nativeAmount,
      outputMint,
      assetSource: assetSource || this.assetSource,
      prismEtf,
      slippage,
      ...rest,
    });

    return outputNativeAmount;
  }

  async sourceInUnderlyingAssets({
    inputNativeAmount,
    inputMint,
    assetSource,
    prismEtf,
    slippage,
    ...rest
  }: {
    inputNativeAmount: number;
    inputMint: PublicKey;
    assetSource?: AssetSource;
    prismEtf: PrismEtf;
    slippage: number;
  } & TxCallbacks): Promise<BN> {
    if (prismEtf.weightedTokensData === null)
      throw new Error("Weighted tokens not initialized");

    const { weightedTokens: weightedTokensArr, length: weightedTokensLength } =
      prismEtf.weightedTokensData;

    const weightedTokens = weightedTokensArr.slice(0, weightedTokensLength);

    const mintToTargetPercent = prismEtf.userPrismEtf.targetAllocations.reduce(
      (acc, { mint, target }) => {
        return { ...acc, [mint]: target / 100 };
      },
      {} as { [mint: string]: number }
    );

    const sources: SourceProps[] = weightedTokens.map(({ mint, weight }) => {
      return {
        nativeAmount: Math.floor(
          inputNativeAmount * (mintToTargetPercent[mint.toString()] as number)
        ),
        inputMint,
        outputMint: mint,
        nativeWeight: weight.toNumber(),
        slippage,
      };
    });

    const etfNativeAmount = getNativeValue(
      await (assetSource || this.assetSource).sourceInAll({ sources, ...rest }),
      prismEtf.prismEtfDecimals
    );

    return new BN(etfNativeAmount);
  }

  async sourceOutUnderlyingAssets({
    nativeAmount,
    outputMint,
    assetSource,
    prismEtf,
    slippage,
    ...rest
  }: {
    nativeAmount: number;
    outputMint: PublicKey;
    assetSource?: AssetSource;
    prismEtf: PrismEtf;
    slippage: number;
  } & TxCallbacks): Promise<BN> {
    if (prismEtf.weightedTokensData === null)
      throw new Error("Weighted tokens not initialized");

    const { weightedTokens: weightedTokensArr, length: weightedTokensLength } =
      prismEtf.weightedTokensData;

    const weightedTokens = weightedTokensArr.slice(0, weightedTokensLength);

    const decimalAmount = getDecimalValue(
      nativeAmount,
      prismEtf.prismEtfDecimals
    );

    const sources: SourceProps[] = weightedTokens.map(({ mint, weight }) => {
      const nativeWeight = weight.toNumber();
      return {
        nativeAmount: Math.floor(decimalAmount * nativeWeight),
        inputMint: mint,
        outputMint,
        nativeWeight,
        slippage,
      };
    });

    const outputNativeAmount = await (
      assetSource || this.assetSource
    ).sourceOutAll({
      sources,
      ...rest,
    });

    return new BN(outputNativeAmount);
  }

  async executeOrder({
    nativeAmount,
    type,
    prismEtf,
    ...rest
  }: {
    nativeAmount: BN;
    type: OrderType;
    prismEtf: PrismEtf;
  } & TxCallbacks) {
    const initOrderState = await prismEtf.initOrderState();

    const amount = prismEtf.orderStateData?.amount ?? nativeAmount;

    const startOrder = await prismEtf.startOrder({
      type,
      amount,
    });

    let transferEnvelopes: TransactionEnvelope[];
    if (type === OrderType.CONSTRUCTION) {
      transferEnvelopes = await prismEtf.cohere({
        orderStateAmount: amount,
      });
    } else {
      transferEnvelopes = await prismEtf.decohere({});
    }

    const finalizeOrder = await prismEtf.finalizeOrder({});

    let indicesToTransfer: number[] | undefined;

    if (prismEtf.transferredTokensData !== null) {
      const { transferredTokens, length: transferredTokensLength } =
        prismEtf.transferredTokensData;
      indicesToTransfer = transferredTokens
        .slice(0, transferredTokensLength)
        .reduce((acc, transferred, i) => {
          if (
            (type === OrderType.CONSTRUCTION && transferred) ||
            (type === OrderType.DECONSTRUCTION && !transferred)
          )
            return acc;
          return [...acc, i];
        }, [] as number[]);
    }

    const partitionedEnvelopes = combineAndPartitionEnvelopes([
      ...(prismEtf.orderStateData === null
        ? [initOrderState, startOrder]
        : prismEtf.orderStateData.status !== OrderStatus.PENDING
        ? [startOrder]
        : []),
      ...(indicesToTransfer !== undefined
        ? indicesToTransfer.map((i) => {
            return transferEnvelopes[i] as TransactionEnvelope;
          })
        : transferEnvelopes),
      finalizeOrder,
    ]);

    const unsignedTxsArr: UnsignedTxData[][] =
      partitionedEnvelopes.length === 1
        ? [
            partitionedEnvelopes.map((data) => {
              return {
                data,
                tag: makeEtfFinalizedKey(prismEtf.prismEtfMint),
              };
            }),
          ]
        : partitionedEnvelopes.length === 2
        ? [
            partitionedEnvelopes.slice(0, 1).map((data) => {
              return {
                data,
                tag: TxTag.orderPrismEtfTransfer,
              };
            }),
            partitionedEnvelopes.slice(1).map((data) => {
              return {
                data,
                tag: makeEtfFinalizedKey(prismEtf.prismEtfMint),
              };
            }),
          ]
        : [
            partitionedEnvelopes.slice(0, 1).map((data) => {
              return {
                data,
                tag: `${TxTag.orderPrismEtfTransfer}-start`,
                groupTag: TxTag.orderPrismEtfTransfer,
              };
            }),
            partitionedEnvelopes.slice(1, -1).map((data, i) => {
              return {
                data,
                tag: `${TxTag.orderPrismEtfTransfer}-${i}`,
                groupTag: TxTag.orderPrismEtfTransfer,
              };
            }),
            partitionedEnvelopes.slice(-1).map((data) => {
              return {
                data,
                tag: makeEtfFinalizedKey(prismEtf.prismEtfMint),
              };
            }),
          ];

    await this.signAndSendTransactions({
      unsignedTxsArr,
      ...rest,
    });
  }

  async getAllEtfs() {
    return await getAllEtfs();
  }

  async getEtf(mint: string) {
    return await getEtf(mint);
  }

  async fetchPrismEtfDataFromSeeds(prismEtfMint: PublicKey) {
    const [prismEtfPda] = await generatePrismEtfAddress(
      prismEtfMint,
      this.beamsplitter.beamsplitter
    );
    return await this.loader.fetchPrismEtfData(prismEtfPda);
  }
}
