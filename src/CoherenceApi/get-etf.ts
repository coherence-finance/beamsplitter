import axios from "axios";

import type { UserPrismEtf } from "./model";

type UserPrismEtfResponse = UserPrismEtf;

export const getEtf = async (
  mint: string
): Promise<UserPrismEtfResponse | undefined> => {
  try {
    const response = await axios.get<UserPrismEtfResponse>(
      `https://api.coherence.finance/prism-etfs/${mint}`
    );
    return response.data;
  } catch (e) {
    console.log(e);
  }
};
