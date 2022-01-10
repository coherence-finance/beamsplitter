import type { AnchorTypes } from "@saberhq/anchor-contrib";

import type { SplitcoinPrism } from "../target/types/splitcoin_prism";

export type PrismTypes = AnchorTypes<
  SplitcoinPrism,
  { prismAsset: PrismAssetData; prism: PrismData }
>;

type Accounts = PrismTypes["Accounts"];
export type PrismAssetData = Accounts["prismAsset"];
export type PrismData = Accounts["prism"];
export type PrismProgram = PrismTypes["Program"];
