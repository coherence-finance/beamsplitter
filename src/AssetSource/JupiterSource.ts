import { getATAAddress } from "@saberhq/token-utils";
import { PublicKey, Transaction } from "@solana/web3.js";

import type {
  TxCallback,
  TxCallbacks,
  UnsignedTxData,
} from "../CoherenceClient";
import { CoherenceClient } from "../CoherenceClient";
import type { CoherenceLoader } from "../CoherenceLoader";
import type { JupiterRoute } from "../JupiterApi";
import { getSerializedSwaps, getValidSwapRoutes } from "../JupiterApi";
import { TxTag } from "../TxTag";
import { delay, getNativeBalance } from "../utils";
import type { AssetSource, SourceProps } from "./AssetSource";

export const constructFromSerializedTx = (str: string) => {
  return Transaction.from(Buffer.from(str, "base64"));
};

const makeSourceInMintKey = (mint: PublicKey) => {
  return `${TxTag.sourceInAsset}-${mint.toString()}`;
};

const makeSourceOutMintKey = (outputMint: PublicKey, inputMint: PublicKey) => {
  return `${
    TxTag.sourceOutAsset
  }-${outputMint.toString()}-${inputMint.toString()}`;
};

const extractMint = (tag: string) => {
  // Length of TxTag + "-"
  if (tag.startsWith(TxTag.sourceInAsset)) {
    return {
      isSourceIn: true,
      mint: new PublicKey(tag.slice(TxTag.sourceInAsset.length + 1)),
    };
  } else {
    const startOfOutputMint = tag.lastIndexOf("-");
    return {
      isSourceIn: false,
      mint: new PublicKey(
        tag.slice(TxTag.sourceOutAsset.length + 1, startOfOutputMint)
      ),
    };
  }
};

const getSourceKey = (prop: SourceProps) => {
  return `${prop.inputMint.toString()}-${prop.outputMint.toString()}`;
};

export type MintToNativeBalance = {
  [mint: string]: number;
};

export class JupiterSource extends CoherenceClient implements AssetSource {
  mintToPreBalance: MintToNativeBalance;
  mintToPostBalance: MintToNativeBalance;

  constructor(
    loader: CoherenceLoader,
    timeout: number,
    _postSendTxCallback?: TxCallback,
    _finishedTxCallback?: TxCallback
  ) {
    const postSendTxCallback: TxCallback = async ({ tag, txid }) => {
      const { mint } = extractMint(tag);

      if (this.mintToPreBalance[mint.toString()] !== undefined) return;

      const tokenAccount = await getATAAddress({
        mint,
        owner: loader.provider.walletKey,
      });
      this.mintToPreBalance[mint.toString()] = await getNativeBalance(
        loader.provider.connection,
        tokenAccount
      );

      await _postSendTxCallback?.({ tag, txid });
    };

    const finishedTxCallback: TxCallback = async ({ tag, txid }) => {
      const { isSourceIn, mint } = extractMint(tag);

      const tokenAccount = await getATAAddress({
        mint,
        owner: loader.provider.walletKey,
      });

      const preBalance = this.mintToPreBalance[mint.toString()] as number;

      let i = 0;
      const maxTries = 10;
      let postBalance = preBalance;
      while (
        i < maxTries &&
        (preBalance === postBalance ||
          (!isSourceIn &&
            postBalance <= (this.mintToPostBalance[mint.toString()] as number)))
      ) {
        postBalance = Number(
          (await getNativeBalance(loader.provider.connection, tokenAccount)) ||
            preBalance
        );
        await delay(500);
        i += 1;
      }

      if (i >= maxTries) return;

      this.mintToPostBalance[mint.toString()] = postBalance;

      await _finishedTxCallback?.({ tag, txid });
    };

    super(loader, timeout, postSendTxCallback, finishedTxCallback);

    this.mintToPreBalance = {};
    this.mintToPostBalance = {};
  }

  async sourceInAll({
    sources,
    finishedTxCallback,
    ...rest
  }: { sources: SourceProps[] } & TxCallbacks) {
    this.resetMintToBalance();

    const keyToSwapTx = await this.makeKeyToSwapTx(sources);

    const unsignedTxsArr: UnsignedTxData[][] = [
      sources.map((source) => {
        const key = getSourceKey(source);
        return {
          tag: makeSourceInMintKey(source.inputMint),
          data: keyToSwapTx[key] as Transaction,
        };
      }),
    ];

    await this.signAndSendTransactions({
      unsignedTxsArr,
      finishedTxCallback,
      ...rest,
    });

    await finishedTxCallback?.({ tag: TxTag.sourceInAssetFinalized, txid: "" });

    const etfNativeAmount = sources.reduce((acc, source) => {
      const mint = source.outputMint.toString();
      const preBalance = this.mintToPreBalance[mint];
      const postBalance = this.mintToPostBalance[mint];

      if (preBalance === undefined || postBalance === undefined) return acc;

      const balanceDiff = postBalance - preBalance;
      const nativeAmountToMint = balanceDiff / source.nativeWeight;

      return Math.min(acc, nativeAmountToMint);
    }, Number.MAX_SAFE_INTEGER);

    return etfNativeAmount;
  }

  async sourceOutAll({
    sources,
    finishedTxCallback,
    ...rest
  }: { sources: SourceProps[] } & TxCallbacks) {
    this.resetMintToBalance();

    const keyToSwapTx = await this.makeKeyToSwapTx(sources);

    const unsignedTxsArr: UnsignedTxData[][] = [
      sources.map((source) => {
        const key = getSourceKey(source);
        return {
          tag: makeSourceOutMintKey(source.outputMint, source.inputMint),
          data: keyToSwapTx[key] as Transaction,
        };
      }),
    ];

    await this.signAndSendTransactions({
      unsignedTxsArr,
      finishedTxCallback,
      ...rest,
    });

    await finishedTxCallback?.({
      tag: TxTag.sourceOutAssetFinalized,
      txid: "",
    });

    const outputMint = (sources[0] as SourceProps).outputMint.toString();

    const outputNativeAmount =
      (this.mintToPostBalance[outputMint] as number) -
      (this.mintToPreBalance[outputMint] as number);

    return outputNativeAmount;
  }

  async makeKeyToSwapTx(sources: SourceProps[]) {
    const keyToSwapTx: {
      [key: string]: Transaction;
    } = {};

    await Promise.all(
      sources.map(async (d) => {
        const tx = await this.sourceSingle(d);
        if (tx) {
          keyToSwapTx[getSourceKey(d)] = tx;
        }
      })
    );

    return keyToSwapTx;
  }

  async sourceSingle({
    nativeAmount,
    inputMint,
    outputMint,
    slippage,
  }: SourceProps): Promise<Transaction | undefined> {
    const routes = await getValidSwapRoutes(
      inputMint.toString(),
      outputMint.toString(),
      nativeAmount,
      slippage
    );
    if (routes === undefined || routes.length === 0) {
      return undefined;
    }

    const swap = await getSerializedSwaps(
      this.getProvider().walletKey.toString(),
      routes[0] as JupiterRoute
    );

    if (swap === undefined) {
      return undefined;
    }

    return constructFromSerializedTx(swap.swapTransaction);
  }

  resetMintToBalance() {
    this.mintToPreBalance = {};
    this.mintToPostBalance = {};
  }
}
