export class TimeoutError extends Error {
  override message: string;
  tag: string;
  txid: string;

  constructor({ tag, txid }: { tag: string; txid: string }) {
    super();
    this.message = `Timed out awaiting confirmation. Please confirm in the explorer: `;
    this.tag = tag;
    this.txid = txid;
  }
}

export class CoherenceError extends Error {
  override message: string;
  tag: string;
  txid: string;

  constructor({
    tag,
    txid,
    message,
  }: {
    tag: string;
    txid: string;
    message: string;
  }) {
    super();
    this.message = message;
    this.tag = tag;
    this.txid = txid;
  }
}

export class SignRejectedError extends Error {}
