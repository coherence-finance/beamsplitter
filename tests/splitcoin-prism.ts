import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { SplitcoinPrism } from "../target/types/splitcoin_prism";

describe("splitcoin-prism", () => {
    // Configure the client to use the local cluster.
    anchor.setProvider(anchor.Provider.local());

    const program = anchor.workspace.SplitcoinPrism as Program<SplitcoinPrism>;

    it("Is initialized!", async () => {
        // Add your test here.
        const tx = await program.rpc.initialize({});
        console.log("Your transaction signature", tx);
    });
});
