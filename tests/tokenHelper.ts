/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import "chai-bn";

import { chaiSolana } from "@saberhq/chai-solana";
import chai from "chai";

import type { WeightedToken } from "../src";
import { coherenceHelper } from "./coherenceBeamsplitterTest";

chai.use(chaiSolana);

// Create's PrismETF using coherencehelper's beamsplitter program
export const createPrismEtfUsingHelper = async (
  weightedTokens: WeightedToken[]
) => {
  await coherenceHelper.sdk.createPrismEtf({
    beamsplitter: coherenceHelper.beamsplitter,
    weightedTokens,
  });
};
