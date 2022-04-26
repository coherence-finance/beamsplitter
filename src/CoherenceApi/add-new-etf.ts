import axios from "axios";

import type { UserPrismEtf } from "./model";

export interface UserPrismEtfPostBody {
  nonce: string;
  mint: string;
  symbol: string;
  name: string;
  targetAllocations: { mint: string; target: number }[];
}

export const addNewEtf = async (
  body: UserPrismEtfPostBody
): Promise<UserPrismEtf | undefined> => {
  try {
    const response = await axios.post<UserPrismEtf>(
      "https://api.coherence.finance/prism-etfs",
      body
    );

    return response.data;
  } catch (e) {
    console.log(e);
  }
};
