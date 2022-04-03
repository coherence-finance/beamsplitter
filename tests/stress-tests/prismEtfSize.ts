/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import "chai-bn";

import { chaiSolana, expectTX } from "@saberhq/chai-solana";
import { PublicKey } from "@saberhq/solana-contrib";
import { BN } from "bn.js";
import chai, { assert, expect } from "chai";

import type { WeightedToken } from "../../src";
import { enumLikeToString, WEIGHTED_TOKENS_CAPACITY } from "../../src";
import { coherenceHelper } from "../coherenceBeamsplitterTest";

chai.use(chaiSolana);

export default function prismEtfSize() {
  const randomNumberTokens =
    Math.floor(Math.random() * WEIGHTED_TOKENS_CAPACITY) + 1;
  it(`Create a Prism ETF with ${randomNumberTokens} asset(s)`, async () => {
    const [initPrismEtFTx, prismEtfMint, weightedTokensAcct] =
      await coherenceHelper.sdk.initPrismEtf({
        beamsplitter: coherenceHelper.beamsplitter,
      });

    await expectTX(initPrismEtFTx, "Initialize asset with assetToken").to.be
      .fulfilled;

    let prismEtf = await coherenceHelper.sdk.fetchPrismEtfDataFromSeeds({
      beamsplitter: coherenceHelper.beamsplitter,
      prismEtfMint,
    });

    if (!prismEtf) {
      assert.fail("Prism Etf was not successfully created");
    }

    assert(prismEtf.manager.equals(coherenceHelper.authority));
    expect(enumLikeToString(prismEtf.status)).to.be.equal("unfinished");

    const weightedTokens: WeightedToken[] = [];
    for (let i = 0; i < randomNumberTokens; i++) {
      weightedTokens.push({
        mint: new PublicKey(i),
        weight: new BN(i + 1),
      });
    }

    const pushTokensEnvelopes = await coherenceHelper.sdk.pushTokens({
      beamsplitter: coherenceHelper.beamsplitter,
      weightedTokens,
      prismEtfMint,
      weightedTokensAcct,
    });

    // Have to do pushing in seq (Promise.all is not an option)
    for (const pushTokensEnvelope of pushTokensEnvelopes) {
      await expectTX(pushTokensEnvelope).to.be.fulfilled;
    }
    const weightedTokenData = await coherenceHelper.sdk.fetchWeightedTokens(
      prismEtf.weightedTokens
    );

    expect(weightedTokenData?.length).to.be.equal(randomNumberTokens);

    for (let i = 0; i < randomNumberTokens; i++) {
      assert(
        weightedTokenData?.weightedTokens[i]?.mint.equals(new PublicKey(i))
      );
      assert(weightedTokenData?.weightedTokens[i]?.weight.eq(new BN(i + 1)));
    }

    const finalizePrismEtfTx = await coherenceHelper.sdk.finalizePrismEtf({
      beamsplitter: coherenceHelper.beamsplitter,
      prismEtfMint,
    });

    await expectTX(finalizePrismEtfTx, "Finalize PrismEtf").to.be.fulfilled;

    prismEtf = await coherenceHelper.sdk.fetchPrismEtfDataFromSeeds({
      beamsplitter: coherenceHelper.beamsplitter,
      prismEtfMint,
    });

    if (!prismEtf) {
      assert.fail("Prism Etf was not successfully created");
    }

    expect(enumLikeToString(prismEtf.status)).to.be.equal("finished");
  });
}
