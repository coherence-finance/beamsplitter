import type { AnchorTypes } from "@saberhq/anchor-contrib";

import type { SplitcoinPrism } from "../target/types/splitcoin_prism";

export type SplitcoinPrismTypes = AnchorTypes<
  SplitcoinPrism,
  { splitcoinPrism: SplitcoinPrismData }
>;

type Accounts = SplitcoinPrismTypes["Accounts"];
export type SplitcoinPrismData = Accounts["splitcoinPrism"];

export type SplitcoinPrismProgram = SplitcoinPrismTypes["Program"];
