import { expectTX } from "@saberhq/chai-solana";
import { TransactionEnvelope } from "@saberhq/solana-contrib";
import {
  createInitMintInstructions,
  createMintToInstruction,
  getMintInfo,
  getOrCreateATA,
} from "@saberhq/token-utils";
import { u64 } from "@solana/spl-token";
import type { PublicKey } from "@solana/web3.js";
import { Keypair } from "@solana/web3.js";
import BN from "bn.js";
import { assert, expect } from "chai";

import type { UserPrismEtf, WeightedToken } from "../../src";
import { enumLikeToString, PrismEtf } from "../../src";
import { coherenceHelper } from "../coherenceBeamsplitterTest";
import constructDeconstruct from "./coherence-beamsplitter";

export default function unitTests() {
  let prismEtfMint: PublicKey;
  let tokenAATA: PublicKey;
  let tokenBATA: PublicKey;
  let weightedTokens: WeightedToken[];
  let prismEtf: PrismEtf;

  const decimalsA = 6;
  const decimalsB = 11;
  const tokenAWeight = new BN(3246753);
  const tokenBWeight = new BN(7);

  const refreshPrismEtf = async () => {
    prismEtf = await PrismEtf.loadPrismEtf({
      beamsplitter: coherenceHelper.sdk.beamsplitter,
      prismEtfMint,
      userPrismEtf: {} as UserPrismEtf,
    });
  };

  /*
  1. Setup 2 Token Mints
  2. Create PrismETF
  3. Mint 100 of each token to testSigner.publicKey
  */
  it("Building sample PrismETF for unitHelper", async () => {
    const [initPrismEtFTx, _prismEtfMint, prismEtfPda, weightedTokensAcct] =
      await coherenceHelper.sdk.beamsplitter.initPrismEtf({});

    prismEtfMint = _prismEtfMint;

    await expectTX(initPrismEtFTx, "Initialize asset with assetToken").to.be
      .fulfilled;

    const mintInfo = await getMintInfo(coherenceHelper.provider, prismEtfMint);
    assert(mintInfo.mintAuthority?.equals(coherenceHelper.beamsplitter));

    await refreshPrismEtf();

    if (!prismEtf.prismEtfData) {
      assert.fail("Prism Etf was not successfully created");
    }

    assert(prismEtf.prismEtfData.manager.equals(coherenceHelper.authority));
    expect(enumLikeToString(prismEtf.prismEtfData.status)).to.be.equal(
      "unfinished"
    );

    const tokenAKP = Keypair.generate();
    const tokenAMintTx = await createInitMintInstructions({
      provider: coherenceHelper.provider,
      mintKP: tokenAKP,
      decimals: decimalsA,
      mintAuthority: coherenceHelper.authority,
    });

    await expectTX(tokenAMintTx).to.be.fulfilled;

    const tokenBKP = Keypair.generate();
    const tokenBMintTx = await createInitMintInstructions({
      provider: coherenceHelper.provider,
      mintKP: tokenBKP,
      decimals: decimalsB,
      mintAuthority: coherenceHelper.authority,
    });

    await expectTX(tokenBMintTx).to.be.fulfilled;

    weightedTokens = [
      {
        mint: tokenAKP.publicKey,
        weight: tokenAWeight,
      },
      {
        mint: tokenBKP.publicKey,
        weight: tokenBWeight,
      },
    ];
    const pushTokensEnvelopes =
      await coherenceHelper.sdk.beamsplitter.pushTokens({
        prismEtfMint,
        prismEtfPda,
        weightedTokens,
        weightedTokensAcct,
      });

    // Have to do pushing in seq (Promise.all is not an option)
    for (const pushTokensEnvelope of pushTokensEnvelopes) {
      await expectTX(pushTokensEnvelope).to.be.fulfilled;
    }

    await refreshPrismEtf();

    expect(prismEtf.weightedTokensData?.length).to.be.equal(2);

    const finalizePrismEtfTx =
      await coherenceHelper.sdk.beamsplitter.finalizePrismEtf({
        prismEtfMint,
        prismEtfPda,
      });

    await expectTX(finalizePrismEtfTx, "Finalize PrismEtf").to.be.fulfilled;

    await refreshPrismEtf();

    if (!prismEtf.prismEtfData) {
      assert.fail("Prism Etf was not successfully created");
    }

    expect(enumLikeToString(prismEtf.prismEtfData.status)).to.be.equal(
      "finished"
    );

    const { address: _tokenAATA, instruction: createAATA } =
      await getOrCreateATA({
        provider: coherenceHelper.provider,
        mint: tokenAKP.publicKey,
        owner: coherenceHelper.authority,
      });

    tokenAATA = _tokenAATA;
    if (createAATA) {
      await expectTX(
        new TransactionEnvelope(coherenceHelper.provider, [createAATA])
      ).to.be.fulfilled;
    }

    const tokenAToTx = createMintToInstruction({
      provider: coherenceHelper.provider,
      mint: tokenAKP.publicKey,
      mintAuthorityKP: coherenceHelper.testSigner,
      to: tokenAATA,
      amount: new u64(100 * 10 ** 9),
    });

    await expectTX(tokenAToTx).to.be.fulfilled;

    const { address: _tokenBATA, instruction: createBATA } =
      await getOrCreateATA({
        provider: coherenceHelper.provider,
        mint: tokenBKP.publicKey,
        owner: coherenceHelper.authority,
      });

    tokenBATA = _tokenBATA;
    if (createBATA) {
      await expectTX(
        new TransactionEnvelope(coherenceHelper.provider, [createBATA])
      ).to.be.fulfilled;
    }

    const tokenBToTx = createMintToInstruction({
      provider: coherenceHelper.provider,
      mint: tokenBKP.publicKey,
      mintAuthorityKP: coherenceHelper.testSigner,
      to: tokenBATA,
      amount: new u64(100 * 10 ** 9),
    });

    await expectTX(tokenBToTx).to.be.fulfilled;
  });

  describe("#UNIT TESTS", () => {
    constructDeconstruct();
  });
}
