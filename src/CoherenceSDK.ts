import type { Provider, TransactionEnvelope } from "@saberhq/solana-contrib";
import { getATAAddress } from "@saberhq/token-utils";
import type { Signer } from "@solana/web3.js";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import base58 from "bs58";

import type { AssetSource, SourceProps } from "./AssetSource";
import type { UserPrismEtfPostBody } from "./CoherenceApi";
import { addNewEtf } from "./CoherenceApi";
import { CoherenceBeamsplitter } from "./CoherenceBeamsplitter";
import type { TxCallback, UnsignedTxData } from "./CoherenceClient";
import { CoherenceClient } from "./CoherenceClient";
import { CoherenceLoader } from "./CoherenceLoader";
import type { PrismEtf } from "./PrismEtf";
import { TxTag } from "./TxTag";
import type { WeightedToken } from "./types";
import { OrderStatus, OrderType } from "./types";
import {
  combineAndPartitionEnvelopes,
  delay,
  getDecimalValue,
  getNativeBalance,
} from "./utils";

const makeEtfFinalizedKey = (mint: PublicKey) => {
  return `${TxTag.orderPrismEtfFinalized}-${mint.toString()}`;
};

const extractEtfMint = (tag: string) => {
  // Length of TxTag + "-"
  if (!tag.startsWith(TxTag.orderPrismEtfFinalized)) return undefined;
  return new PublicKey(tag.slice(TxTag.orderPrismEtfFinalized.length + 1));
};

export class CoherenceSDK extends CoherenceClient {
  beamsplitter: CoherenceBeamsplitter;
  etfPreBalance: number;
  etfPostBalance: number;

  constructor(
    loader: CoherenceLoader,
    beamsplitter: CoherenceBeamsplitter,
    timeout: number,
    _postSendTxCallback?: TxCallback,
    _finishedTxCallback?: TxCallback
  ) {
    const postSendTxCallback: TxCallback = async ({ tag, txid }) => {
      const mint = extractEtfMint(tag);
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
      const mint = extractEtfMint(tag);
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

    this.beamsplitter = beamsplitter;
    this.etfPreBalance = 0;
    this.etfPostBalance = 0;
  }

  static async init({
    provider,
    timeout = 60000,
    postSendTxCallback,
    finishedTxCallback,
  }: {
    provider: Provider;
    timeout?: number;
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
      postSendTxCallback,
      finishedTxCallback
    );
  }

  static async initWithSigner({
    provider,
    signer,
    timeout = 60000,
    postSendTxCallback,
    finishedTxCallback,
  }: {
    provider: Provider;
    signer: Signer;
    timeout?: number;
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
      postSendTxCallback,
      finishedTxCallback
    );
  }

  async refreshBeamsplitter() {
    this.beamsplitter = await CoherenceBeamsplitter.loadBeamsplitter({
      loader: this.loader,
    });
  }

  // Create ETF
  async createAndListEtf({
    tokens,
    listingMessage,
    signMessage,
    name,
    symbol,
  }: {
    tokens: WeightedToken[];
    listingMessage?: string;
    signMessage: (s: Uint8Array) => Promise<Uint8Array>;
    name: string;
    symbol: string;
  }): Promise<PublicKey> {
    const prismEtfMint = await this.createPrismEtf({ tokens });
    await this.listPrismEtf({
      prismEtfMint,
      listingMessage,
      signMessage,
      name,
      symbol,
      targetAllocations: tokens.map(({ mint, weight }) => {
        return { mint: mint.toString(), target: weight.toNumber() };
      }),
    });
    return prismEtfMint;
  }

  async createPrismEtf({
    tokens,
  }: {
    tokens: WeightedToken[];
  }): Promise<PublicKey> {
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
  }: {
    prismEtfMint: PublicKey;
    listingMessage?: string;
    signMessage: (s: Uint8Array) => Promise<Uint8Array>;
    name: string;
    symbol: string;
    targetAllocations: UserPrismEtfPostBody["targetAllocations"];
  }) {
    const message = new TextEncoder().encode(listingMessage);
    const signature = await signMessage(message);

    const etfBody: UserPrismEtfPostBody = {
      nonce: base58.encode(signature),
      mint: prismEtfMint.toString(),
      name,
      symbol,
      targetAllocations,
    };

    await this.postSendTxCallback?.({
      tag: TxTag.listPrismEtf,
      txid: signature.toString(),
    });

    await addNewEtf(etfBody);

    await this.finishedTxCallback?.({
      tag: TxTag.listPrismEtf,
      txid: signature.toString(),
    });
  }

  // Buy/sell ETF
  async buyEtf({
    inputNativeAmount,
    inputMint,
    assetSource,
    prismEtf,
    slippage,
  }: {
    inputNativeAmount: number;
    inputMint: PublicKey;
    assetSource: AssetSource;
    prismEtf: PrismEtf;
    slippage: number;
  }) {
    const etfNativeAmount = await this.sourceInUnderlyingAssets({
      inputNativeAmount,
      inputMint,
      assetSource,
      prismEtf,
      slippage,
    });
    await this.executeOrder({
      nativeAmount: etfNativeAmount,
      type: OrderType.CONSTRUCTION,
      prismEtf,
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
  }: {
    nativeAmount: number;
    outputMint: PublicKey;
    assetSource: AssetSource;
    prismEtf: PrismEtf;
    slippage: number;
  }) {
    await this.executeOrder({
      nativeAmount: new BN(nativeAmount),
      type: OrderType.DECONSTRUCTION,
      prismEtf,
    });
    const outputNativeAmount = await this.sourceOutUnderlyingAssets({
      nativeAmount,
      outputMint,
      assetSource,
      prismEtf,
      slippage,
    });

    return outputNativeAmount;
  }

  async sourceInUnderlyingAssets({
    inputNativeAmount,
    inputMint,
    assetSource,
    prismEtf,
    slippage,
  }: {
    inputNativeAmount: number;
    inputMint: PublicKey;
    assetSource: AssetSource;
    prismEtf: PrismEtf;
    slippage: number;
  }): Promise<BN> {
    if (prismEtf.weightedTokensData === null)
      throw new Error("Weighted tokens not initialized");

    const { weightedTokens: weightedTokensArr, length: weightedTokensLength } =
      prismEtf.weightedTokensData;

    const weightedTokens = weightedTokensArr.slice(0, weightedTokensLength);

    const decimalWeightTokens = weightedTokens.map(({ mint, weight }) => {
      const decimals = prismEtf.mintToDecimal[mint.toString()] as number;
      return {
        mint,
        nativeWeight: weight.toNumber(),
        decimalWeight: getDecimalValue(weight.toNumber(), decimals),
      };
    });
    const totalDecimalWeight = decimalWeightTokens.reduce(
      (acc, { decimalWeight }) => {
        return acc + decimalWeight;
      },
      0
    );

    const sources: SourceProps[] = decimalWeightTokens.map(
      ({ mint, nativeWeight, decimalWeight }) => {
        return {
          nativeAmount: Math.floor(
            inputNativeAmount * (decimalWeight / totalDecimalWeight)
          ),
          inputMint,
          outputMint: mint,
          nativeWeight,
          slippage,
        };
      }
    );

    const etfNativeAmount = await assetSource.sourceInAll(sources);

    return new BN(etfNativeAmount);
  }

  async sourceOutUnderlyingAssets({
    nativeAmount,
    outputMint,
    assetSource,
    prismEtf,
    slippage,
  }: {
    nativeAmount: number;
    outputMint: PublicKey;
    assetSource: AssetSource;
    prismEtf: PrismEtf;
    slippage: number;
  }): Promise<BN> {
    if (prismEtf.weightedTokensData === null)
      throw new Error("Weighted tokens not initialized");

    const { weightedTokens: weightedTokensArr, length: weightedTokensLength } =
      prismEtf.weightedTokensData;

    const weightedTokens = weightedTokensArr.slice(0, weightedTokensLength);

    const decimalAmount = getDecimalValue(nativeAmount, prismEtf.getDecimals());

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

    const outputNativeAmount = await assetSource.sourceOutAll(sources);

    return new BN(outputNativeAmount);
  }

  async executeOrder({
    nativeAmount,
    type,
    prismEtf,
  }: {
    nativeAmount: BN;
    type: OrderType;
    prismEtf: PrismEtf;
  }) {
    const initOrderState = await prismEtf.initOrderState();

    const startOrder = await prismEtf.startOrder({
      type,
      amount: nativeAmount,
    });

    let transferEnvelopes: TransactionEnvelope[];
    if (type === OrderType.CONSTRUCTION) {
      transferEnvelopes = await prismEtf.cohere({
        orderStateAmount: nativeAmount,
      });
    } else {
      transferEnvelopes = await prismEtf.decohere({});
    }

    const finalizeOrder = await prismEtf.finalizeOrder({});

    if (prismEtf.transferredTokensData === null) {
      throw new Error("Transferred tokens not initialized");
    }

    const { transferredTokens, length: transferredTokensLength } =
      prismEtf.transferredTokensData;
    const indicesToTransfer = transferredTokens
      .slice(0, transferredTokensLength)
      .reduce((acc, transferred, i) => {
        if (
          (type === OrderType.CONSTRUCTION && transferred) ||
          (type === OrderType.DECONSTRUCTION && !transferred)
        )
          return acc;
        return [...acc, i];
      }, [] as number[]);

    const partitionedEnvelopes = combineAndPartitionEnvelopes([
      ...(prismEtf.orderStateData === null
        ? [initOrderState, startOrder]
        : prismEtf.orderStateData.status === OrderStatus.PENDING
        ? [startOrder]
        : []),
      ...indicesToTransfer.map((i) => {
        return transferEnvelopes[i] as TransactionEnvelope;
      }),
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
    });
  }
}
