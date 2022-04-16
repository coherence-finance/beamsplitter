import axios from "axios";

import type { JupiterRoute } from "./model";

export interface JupiterSerializedSwap {
  setupTransaction?: string;
  swapTransaction: string;
  cleanupTransaction?: string;
}

export const getSerializedSwaps = async (
  userPublicKey: string,
  route: JupiterRoute
): Promise<JupiterSerializedSwap | undefined> => {
  try {
    const response = await axios.post<JupiterSerializedSwap>(
      "https://quote-api.jup.ag/v1/swap",
      {
        // route from /quote api
        route,
        // user public key to be used for the swap
        userPublicKey,
        // auto wrap and unwrap SOL
        wrapUnwrapSOL: false,
      }
    );

    return response.data;
  } catch (e) {
    console.log(e);
  }
};
