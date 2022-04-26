import axios from "axios";

import type { UserPrismEtf } from "./model";

type UserPrismEtfResponse = UserPrismEtf[];

export const getAllEtfs = async (): Promise<
  UserPrismEtfResponse | undefined
> => {
  try {
    const response = await axios.get<UserPrismEtfResponse>(
      "https://api.coherence.finance/prism-etfs"
    );
    return response.data;
  } catch (e) {
    console.log(e);
  }
};
