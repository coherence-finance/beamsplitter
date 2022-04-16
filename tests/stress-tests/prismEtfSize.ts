/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import "chai-bn";

import { chaiSolana, expectTX } from "@saberhq/chai-solana";
import { PublicKey } from "@saberhq/solana-contrib";
import { BN } from "bn.js";
import chai, { assert, expect } from "chai";

import type { WeightedToken } from "../../src";
import {
  enumLikeToString,
  PrismEtf,
  WEIGHTED_TOKENS_CAPACITY,
} from "../../src";
import { coherenceHelper } from "../coherenceBeamsplitterTest";

chai.use(chaiSolana);

export default function prismEtfSize() {
  const randomNumberTokens =
    Math.floor(Math.random() * WEIGHTED_TOKENS_CAPACITY) + 1;
  it(`Create a Prism ETF with ${randomNumberTokens} asset(s)`, async () => {
    const [initPrismEtFTx, prismEtfMint, prismEtfPda, weightedTokensAcct] =
      await coherenceHelper.sdk.beamsplitter.initPrismEtf({});

    await expectTX(initPrismEtFTx, "Initialize asset with assetToken").to.be
      .fulfilled;

    let prismEtf = await PrismEtf.loadPrismEtf({
      beamsplitter: coherenceHelper.sdk.beamsplitter,
      prismEtfMint,
    });

    if (!prismEtf.prismEtfData) {
      assert.fail("Prism Etf was not successfully created");
    }

    assert(prismEtf.prismEtfData.manager.equals(coherenceHelper.authority));
    expect(enumLikeToString(prismEtf.prismEtfData.status)).to.be.equal(
      "unfinished"
    );

    const weightedTokens: WeightedToken[] = [];
    for (let i = 0; i < randomNumberTokens; i++) {
      weightedTokens.push({
        mint: new PublicKey(i),
        weight: new BN(i + 1),
      });
    }

    const pushTokensEnvelopes =
      await coherenceHelper.sdk.beamsplitter.pushTokens({
        weightedTokens,
        prismEtfMint,
        prismEtfPda,
        weightedTokensAcct,
        shouldCreateAtas: false,
      });

    // Have to do pushing in seq (Promise.all is not an option)
    for (const pushTokensEnvelope of pushTokensEnvelopes) {
      await expectTX(pushTokensEnvelope).to.be.fulfilled;
    }

    prismEtf = await PrismEtf.loadPrismEtf({
      beamsplitter: coherenceHelper.sdk.beamsplitter,
      prismEtfMint,
    });

    expect(prismEtf.weightedTokensData?.length).to.be.equal(randomNumberTokens);

    for (let i = 0; i < randomNumberTokens; i++) {
      assert(
        prismEtf.weightedTokensData?.weightedTokens[i]?.mint.equals(
          new PublicKey(i)
        )
      );
      assert(
        prismEtf.weightedTokensData?.weightedTokens[i]?.weight.eq(new BN(i + 1))
      );
    }
    console.log("LO43");

    const finalizePrismEtfTx =
      await coherenceHelper.sdk.beamsplitter.finalizePrismEtf({
        prismEtfMint,
        prismEtfPda,
      });

    await expectTX(finalizePrismEtfTx, "Finalize PrismEtf").to.be.fulfilled;

    prismEtf = await PrismEtf.loadPrismEtf({
      beamsplitter: coherenceHelper.sdk.beamsplitter,
      prismEtfMint,
    });

    if (!prismEtf.prismEtfData) {
      assert.fail("Prism Etf was not successfully created");
    }

    expect(enumLikeToString(prismEtf.prismEtfData.status)).to.be.equal(
      "finished"
    );
  });
}
