/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import "chai-bn";

import { chaiSolana, expectTX } from "@saberhq/chai-solana";
import type { PublicKey } from "@saberhq/solana-contrib";
import { TransactionEnvelope } from "@saberhq/solana-contrib";
import {
  createInitMintInstructions,
  createMintToInstruction,
  getMintInfo,
  getOrCreateATA,
  u64,
} from "@saberhq/token-utils";
import { Keypair } from "@solana/web3.js";
import { BN } from "bn.js";
import chai, { assert, expect } from "chai";

import type { WeightedToken } from "../src";
import { enumLikeToString } from "../src";
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
