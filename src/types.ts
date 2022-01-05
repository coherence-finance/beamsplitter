import type { AnchorTypes } from "@saberhq/anchor-contrib";

import type { SplitcoinPrism } from "../target/types/splitcoin_prism";

export type PrismTypes = AnchorTypes<
  SplitcoinPrism,
  { prismAsset: PrismAssetData }
>;

type Accounts = PrismTypes["Accounts"];
export type PrismAssetData = Accounts["prismAsset"];

export type PrismProgram = PrismTypes["Program"];
