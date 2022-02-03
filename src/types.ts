import type { AnchorTypes } from "@saberhq/anchor-contrib";

import type { SplitcoinPrism } from "../target/types/splitcoin_prism";

export type PrismTypes = AnchorTypes<
  SplitcoinPrism,
  {
    prismAsset: PrismAssetData;
    prism: PrismData;
  },
  {
    Feed: ConstantValueFeed;
  }
>;

type Accounts = PrismTypes["Accounts"];
export type PrismAssetData = Accounts["prismAsset"];
export type PrismData = Accounts["prism"];
export type PrismProgram = PrismTypes["Program"];

export type Defined = PrismTypes["Defined"];
export type AssetData = Defined["AssetData"];
export type ConstantValueFeed = Defined["ConstantValueFeed"];
