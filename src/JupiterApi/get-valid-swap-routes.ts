import axios from "axios";

import type { JupiterRoute } from "./model";

export interface JupiterValidSwapsResponse {
  data: JupiterRoute[];
}

export const getValidSwapRoutes = async (
  inputMint: string,
  outputMint: string,
  amount: number,
  slippage: number,
  feeBps?: number
): Promise<JupiterRoute[] | undefined> => {
  try {
    const response = await axios.get<JupiterValidSwapsResponse>(
      `https://quote-api.jup.ag/v1/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippage=${slippage}&onlyDirectRoutes=true${
        feeBps !== undefined ? `&feeBps=${feeBps}` : ""
      }`
    );
    console.log();
    return response.data.data;
  } catch (e) {
    console.log(e);
  }
};
