import type { AnchorTypes } from "@saberhq/anchor-contrib";
import { SplitcoinPrism } from "../target/types/splitcoin_prism";

export type SplitcoinPrismTypes = AnchorTypes<SplitcoinPrism>;

export type SplitcoinPrismProgram = SplitcoinPrismTypes["Program"];
export type SplitcoinPrismData =
    SplitcoinPrismTypes["Accounts"]["splitcoinPrism"];
