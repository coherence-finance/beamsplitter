import type { AnchorTypes } from "@saberhq/anchor-contrib";

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
export type AssetData = Defined["AssetData"];
export type Feed = Defined["Feed"];
