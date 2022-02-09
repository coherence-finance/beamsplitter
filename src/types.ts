import type { AnchorTypes } from "@saberhq/anchor-contrib";
import type BN from "bn.js";

import type { CoherenceBeamsplitter } from "../target/types/coherence_beamsplitter";

export type BeamsplitterTypes = AnchorTypes<
  CoherenceBeamsplitter,
  {
    prismEtf: PrismEtfData;
    beamsplitter: BeamsplitterData;
  },
  {
    feed: Feed;
  }
>;

type Accounts = BeamsplitterTypes["Accounts"];
export type PrismEtfData = Accounts["prismEtf"];
export type BeamsplitterData = Accounts["beamsplitter"];
export type BeamsplitterProgram = BeamsplitterTypes["Program"];

export type Defined = BeamsplitterTypes["Defined"];

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
