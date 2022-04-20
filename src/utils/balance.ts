import type { Connection, PublicKey } from "@solana/web3.js";

export const getNativeBalance = async (
  connection: Connection,
  tokenAccount: PublicKey
) => {
  try {
    return Number(
      (await connection.getTokenAccountBalance(tokenAccount, "processed")).value
        .amount || "0"
    );
  } catch (e) {
    return 0;
  }
};
