import type { Connection, PublicKey } from "@solana/web3.js";

export const getNativeBalance = async (
  connection: Connection,
  tokenAccount: PublicKey
) => {
  return Number(
    (await connection.getTokenAccountBalance(tokenAccount, "processed")).value
      .amount || "0"
  );
};
