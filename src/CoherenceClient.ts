import type {
  AugmentedProvider,
  TransactionEnvelope,
} from "@saberhq/solana-contrib";
import type {
  Commitment,
  Connection,
  RpcResponseAndContext,
  SimulatedTransactionResponse,
  Transaction,
  TransactionConfirmationStatus,
  TransactionSignature,
} from "@solana/web3.js";

import type { CoherenceLoader } from "./CoherenceLoader";
import { CoherenceError, SignRejectedError, TimeoutError } from "./error";
import { delay, getUnixTs } from "./utils";

export type UnsignedTxData = {
  data: TransactionEnvelope | Transaction;
} & Omit<SignedTxData, "tx">;

export type SignedTxData = {
  tx: Transaction;
  tag: string;
  groupTag?: string;
};

export type TxCallback = (data: { tag: string; txid: string }) => Promise<void>;

export type TxCallbacks = {
  postSendTxCallback?: TxCallback;
  finishedTxCallback?: TxCallback;
};

export class CoherenceClient {
  postSendTxCallback?: TxCallback;
  finishedTxCallback?: TxCallback;

  constructor(
    readonly loader: CoherenceLoader,
    readonly timeout: number,
    postSendTxCallback?: TxCallback,
    finishedTxCallback?: TxCallback
  ) {
    this.postSendTxCallback = postSendTxCallback;
    this.finishedTxCallback = finishedTxCallback;
  }

  async signAndSendTransactions({
    unsignedTxsArr,
    ...rest
  }: {
    unsignedTxsArr: UnsignedTxData[][];
  } & TxCallbacks) {
    const signedTxs = await this.signTransactions({ unsignedTxsArr });
    await this.executeAndWaitForTxs({ unsignedTxsArr, signedTxs, ...rest });
  }

  async signTransactions({
    unsignedTxsArr,
  }: {
    unsignedTxsArr: UnsignedTxData[][];
  }) {
    const flattenedUnsignedTxs = unsignedTxsArr.flat();

    let signedTxs: SignedTxData[];

    try {
      signedTxs = (
        await this.getProvider().signer.signAll(
          flattenedUnsignedTxs.map(({ data }) => {
            if ("build" in data) {
              return {
                tx: data.build(),
                signers: data.signers,
              };
            } else {
              return {
                tx: data,
                signers: [],
              };
            }
          })
        )
      ).map((tx, i) => ({ tx, ...flattenedUnsignedTxs[i] })) as SignedTxData[];
    } catch (e) {
      throw new SignRejectedError();
    }

    return signedTxs;
  }

  async executeAndWaitForTxs({
    unsignedTxsArr,
    signedTxs,
    ...rest
  }: {
    unsignedTxsArr: UnsignedTxData[][];
    signedTxs: SignedTxData[];
  } & TxCallbacks) {
    for (const unsignedTxArr of unsignedTxsArr) {
      const uniqueTags = new Set(unsignedTxArr.map(({ tag }) => tag));

      await Promise.all(
        Array.from(uniqueTags).map(async (tag) => {
          const _txs = signedTxs.filter((d) => d.tag === tag);
          for (const { tx, groupTag } of _txs) {
            await this.sendSignedTransaction({
              tag: groupTag || tag,
              signedTransaction: tx,
              ...rest,
            });
          }
        })
      );
    }
  }

  async sendSignedTransaction({
    tag,
    signedTransaction,
    timeout = this.timeout,
    confirmLevel = "processed",
    postSendTxCallback,
    finishedTxCallback,
  }: {
    tag: string;
    signedTransaction: Transaction;
    timeout?: number;
    confirmLevel?: TransactionConfirmationStatus;
  } & TxCallbacks): Promise<TransactionSignature> {
    const rawTransaction = signedTransaction.serialize();
    const startTime = getUnixTs();

    const txid: TransactionSignature =
      await this.getConnection().sendRawTransaction(rawTransaction, {
        skipPreflight: true,
      });

    try {
      await Promise.all([
        postSendTxCallback?.({ tag, txid }),
        this.postSendTxCallback?.({ tag, txid }),
      ]);
    } catch (e) {
      if (e instanceof Error) {
        console.log(`postSendTxCallback error ${e.message}`);
      }
    }
    if (!timeout) return txid;

    let done = false;
    void (async () => {
      await delay(500);
      while (!done && getUnixTs() - startTime < timeout) {
        void this.getConnection().sendRawTransaction(rawTransaction, {
          skipPreflight: true,
        });
        await delay(1000);
      }
    })();
    try {
      await this.awaitTransactionSignatureConfirmation(
        txid,
        timeout,
        confirmLevel
      );
      await Promise.all([
        finishedTxCallback?.({ tag, txid }),
        this.finishedTxCallback?.({ tag, txid }),
      ]);
    } catch (err) {
      // @ts-ignore
      if (err.timeout) {
        throw new TimeoutError({ tag, txid });
      }
      let simulateResult: SimulatedTransactionResponse | null = null;
      try {
        simulateResult = (
          await this.simulateTransaction(signedTransaction, "single")
        ).value;
      } catch (e) {
        console.log("Simulate tx failed");
      }
      if (simulateResult && simulateResult.err) {
        if (simulateResult.logs) {
          for (let i = simulateResult.logs.length - 1; i >= 0; --i) {
            const line = simulateResult.logs[i];
            if (line && line.startsWith("Program log: ")) {
              throw new CoherenceError({
                message:
                  "Transaction failed: " + line.slice("Program log: ".length),
                tag,
                txid,
              });
            }
          }
        }
        throw new CoherenceError({
          message: JSON.stringify(simulateResult.err),
          tag,
          txid,
        });
      }
      throw new CoherenceError({ message: "Transaction failed", tag, txid });
    } finally {
      done = true;
    }

    // console.log("Latency", txid, getUnixTs() - startTime);
    return txid;
  }

  async awaitTransactionSignatureConfirmation(
    txid: string,
    timeout: number,
    confirmLevel: TransactionConfirmationStatus
  ) {
    let done = false;

    const confirmLevels: (TransactionConfirmationStatus | null | undefined)[] =
      ["finalized"];

    if (confirmLevel === "confirmed") {
      confirmLevels.push("confirmed");
    } else if (confirmLevel === "processed") {
      confirmLevels.push("confirmed");
      confirmLevels.push("processed");
    }
    let subscriptionId;

    const result = await new Promise((resolve, reject) => {
      void (async () => {
        setTimeout(() => {
          if (done) {
            return;
          }
          done = true;
          console.log("Timed out for txid: ", txid);
          reject({ timeout: true });
        }, timeout);
        try {
          subscriptionId = this.getConnection().onSignature(
            txid,
            (result) => {
              subscriptionId = undefined;
              done = true;
              if (result.err) {
                reject(result.err);
              } else {
                resolve(result);
              }
            },
            confirmLevel
          );
        } catch (e) {
          done = true;
          console.log("WS error in setup", txid, e);
        }
        let retrySleep = 400;
        while (!done) {
          // eslint-disable-next-line no-loop-func
          await delay(retrySleep);
          void (async () => {
            try {
              const response = await this.getConnection().getSignatureStatuses([
                txid,
              ]);

              const result = response && response.value[0];
              if (!done) {
                if (!result) {
                  // console.log('REST null result for', txid, result);
                } else if (result.err) {
                  console.log("REST error for", txid, result);
                  done = true;
                  reject(result.err);
                } else if (
                  !(
                    result.confirmations ||
                    confirmLevels.includes(result.confirmationStatus)
                  )
                ) {
                  console.log("REST not confirmed", txid, result);
                } else {
                  console.log("REST confirmed", txid, result);
                  done = true;
                  resolve(result);
                }
              }
            } catch (e) {
              if (!done) {
                console.log("REST connection error: txid", txid, e);
              }
            }
          })();
          if (retrySleep <= 1600) {
            retrySleep = retrySleep * 2;
          }
        }
      })();
    });

    if (subscriptionId) {
      this.getConnection()
        .removeSignatureListener(subscriptionId)
        .catch((e) => {
          console.log("WS error in cleanup", e);
        });
    }

    done = true;
    return result;
  }

  // Need to use private functions so need to hack around eslint
  async simulateTransaction(
    transaction: Transaction,
    commitment: Commitment
  ): Promise<RpcResponseAndContext<SimulatedTransactionResponse>> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    transaction.recentBlockhash = await // eslint-disable-next-line
    (this.getConnection() as any)._recentBlockhash(
      // eslint-disable-next-line
      (this.getConnection() as any)._disableBlockhashCaching
    );

    const signData = transaction.serializeMessage();
    // @ts-ignore
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const wireTransaction = transaction._serialize(signData);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const encodedTransaction = wireTransaction.toString("base64");
    const config = { encoding: "base64", commitment };
    const args = [encodedTransaction, config];

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    const res = await (this.getConnection() as any)._rpcRequest(
      "simulateTransaction",
      args
    );
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (res.error) {
      throw new Error(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        `failed to simulate transaction: ${res.error.message as string}`
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return res.result as RpcResponseAndContext<SimulatedTransactionResponse>;
  }

  getConnection(): Connection {
    return this.loader.getConnection();
  }

  getProvider(): AugmentedProvider {
    return this.loader.provider;
  }
}
