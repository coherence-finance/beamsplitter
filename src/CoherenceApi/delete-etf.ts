import axios from "axios";

import type { UserPrismEtf } from "./model";

export const deleteEtf = async (
  mint: string
): Promise<UserPrismEtf | undefined> => {
  try {
    const response = await axios.delete<UserPrismEtf>(
      `https://api.coherence.finance/prism-etfs/${mint}`
    );

    return response.data;
  } catch (e) {
    console.log(e);
  }
};
