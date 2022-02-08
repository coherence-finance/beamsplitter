import type { AnchorTypes } from "@saberhq/anchor-contrib";
import BN from "bn.js";

import type { SplitcoinPrism } from "../target/types/splitcoin_prism";

export type PrismTypes = AnchorTypes<
  SplitcoinPrism,
  {
    prismToken: PrismTokenData;
    prism: PrismData;
  },
  {
    feed: Feed;
  }
>;

type Accounts = PrismTypes["Accounts"];
export type PrismTokenData = Accounts["prismToken"];
export type PrismData = Accounts["prism"];
export type PrismProgram = PrismTypes["Program"];

export type Defined = PrismTypes["Defined"];

export interface ConstantValueFeed {
  constant: {
    price: BN;
    expo: number;
  };
}

export type Feed = ConstantValueFeed;
export interface AssetData {
  dataFeed: Feed;
  weight: BN;
}
