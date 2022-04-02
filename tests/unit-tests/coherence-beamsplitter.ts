/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import "chai-bn";

import { chaiSolana, expectTX } from "@saberhq/chai-solana";
import { PublicKey, TransactionEnvelope } from "@saberhq/solana-contrib";
import {
  createInitMintInstructions,
  createMintToInstruction,
  getATAAddress,
  getMintInfo,
  getOrCreateATA,
  getTokenAccount,
  u64,
} from "@saberhq/token-utils";
import { Keypair } from "@solana/web3.js";
import { BN } from "bn.js";
import chai, { assert, expect } from "chai";

import type { WeightedToken } from "../../src";
import { enumLikeToString, OrderType, PRISM_ETF_DECIMALS } from "../../src";
import { coherenceHelper } from "../helper";

chai.use(chaiSolana);

describe("coherence-beamsplitter", () => {
  describe("Construct & Deconstruct", () => {
    let prismEtfMint: PublicKey;
    let tokenAATA: PublicKey;
    let tokenBATA: PublicKey;
    let tokenBMint: PublicKey;
    let transferredTokensAcct: PublicKey;
    let weightedTokens: WeightedToken[];

    const decimalsA = 6;
    const decimalsB = 11;
    const tokenAWeight = new BN(3246753);
    const tokenBWeight = new BN(7);

    /*
    1. Setup 2 Token Mints
    2. Create PrismETF
    3. Mint 100 of each token to testSigner.publicKey
    */
    before(async () => {
      const [initPrismEtFTx, _prismEtfMint, weightedTokensAcct] =
        await coherenceHelper.sdk.initPrismEtf({
          beamsplitter: coherenceHelper.beamsplitter,
        });

      prismEtfMint = _prismEtfMint;

      await expectTX(initPrismEtFTx, "Initialize asset with assetToken").to.be
        .fulfilled;

      const mintInfo = await getMintInfo(
        coherenceHelper.provider,
        prismEtfMint
      );
      assert(mintInfo.mintAuthority?.equals(coherenceHelper.beamsplitter));

      let prismEtf = await coherenceHelper.sdk.fetchPrismEtfDataFromSeeds({
        beamsplitter: coherenceHelper.beamsplitter,
        prismEtfMint,
      });

      if (!prismEtf) {
        assert.fail("Prism Etf was not successfully created");
      }

      assert(prismEtf.manager.equals(coherenceHelper.authority));
      expect(enumLikeToString(prismEtf.status)).to.be.equal("unfinished");

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

      tokenBMint = tokenBKP.publicKey;

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
      const pushTokensEnvelopes = await coherenceHelper.sdk.pushTokens({
        beamsplitter: coherenceHelper.beamsplitter,
        prismEtfMint,
        weightedTokens,
        weightedTokensAcct,
      });

      // Have to do pushing in seq (Promise.all is not an option)
      for (const pushTokensEnvelope of pushTokensEnvelopes) {
        await expectTX(pushTokensEnvelope).to.be.fulfilled;
      }

      const weightedTokenData = await coherenceHelper.sdk.fetchWeightedTokens(
        prismEtf.weightedTokens
      );

      expect(weightedTokenData?.length).to.be.equal(2);

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

    it(`Construct two asset Prism ETF`, async () => {
      const _scalar =
        10 **
        (await getMintInfo(coherenceHelper.provider, prismEtfMint)).decimals;
      const AMOUNT_TO_CONSTRUCT = new BN(1800266);

      const tokenABalBefore = (
        await getTokenAccount(coherenceHelper.provider, tokenAATA)
      ).amount;

      const tokenBBalBefore = (
        await getTokenAccount(coherenceHelper.provider, tokenBATA)
      ).amount;

      const [initOrderState, _transferredTokens, id] =
        await coherenceHelper.sdk.initOrderState({
          beamsplitter: coherenceHelper.beamsplitter,
          prismEtfMint,
        });

      transferredTokensAcct = _transferredTokens;
      await expectTX(initOrderState).to.be.fulfilled;

      let orderState = await coherenceHelper.sdk.fetchOrderStateDataFromSeeds({
        beamsplitter: coherenceHelper.beamsplitter,
        prismEtfMint,
        id,
      });

      expect(orderState?.transferredTokens).to.not.be.undefined;
      expect(enumLikeToString(orderState?.status)).to.be.equal("succeeded");

      const [startOrder] = await coherenceHelper.sdk.startOrder({
        beamsplitter: coherenceHelper.beamsplitter,
        prismEtfMint,
        type: OrderType.CONSTRUCTION,
        amount: AMOUNT_TO_CONSTRUCT,
        transferredTokens: _transferredTokens,
      });

      await expectTX(startOrder).to.be.fulfilled;

      if (!orderState?.transferredTokens) {
        return new Error("Transferred Tokens undefined");
      }

      let transferredTokens = await coherenceHelper.sdk.fetchTransferredTokens(
        orderState?.transferredTokens
      );

      if (!transferredTokens?.transferredTokens) {
        return new Error("Transferred Tokens Array undefined");
      }

      let transferredTokensArr = transferredTokens.transferredTokens;

      for (let i = 0; i < transferredTokens.length; i++) {
        expect(transferredTokensArr[i]).to.be.false;
      }

      assert(
        coherenceHelper.authority.equals(
          coherenceHelper.sdk.provider.wallet.publicKey
        )
      );
      const etfATAAddress = await getATAAddress({
        mint: prismEtfMint,
        owner: coherenceHelper.authority,
      });

      const etfBalanceBefore = (
        await getTokenAccount(coherenceHelper.provider, etfATAAddress)
      ).amount;

      const [, _id] = await coherenceHelper.sdk.getNextAvailableOrderState({
        beamsplitter: coherenceHelper.beamsplitter,
        prismEtfMint,
      });

      orderState = await coherenceHelper.sdk.fetchOrderStateDataFromSeeds({
        beamsplitter: coherenceHelper.beamsplitter,
        prismEtfMint,
        id,
      });

      assert(orderState?.amount.eq(new BN(AMOUNT_TO_CONSTRUCT)));
      expect(enumLikeToString(orderState?.status)).to.be.equal("pending");
      expect(enumLikeToString(orderState?.orderType)).to.be.equal(
        "construction"
      );

      const cohere = await coherenceHelper.sdk.cohere({
        beamsplitter: coherenceHelper.beamsplitter,
        prismEtfMint,
        transferredTokens: _transferredTokens,
        orderStateAmount: AMOUNT_TO_CONSTRUCT,
        orderStateId: _id,
      });

      await Promise.all(
        cohere.map((cohereChunk) => expectTX(cohereChunk).to.be.fulfilled)
      );

      const tokenABalAfter = (
        await getTokenAccount(coherenceHelper.provider, tokenAATA)
      ).amount;

      const actualTokenABalDiff = tokenABalBefore.sub(new BN(tokenABalAfter));

      if (!weightedTokens[0]?.weight) {
        return new Error("weight A undefined");
      }

      const scalarA = new BN(10).pow(new BN(PRISM_ETF_DECIMALS));

      let expectedADiff = AMOUNT_TO_CONSTRUCT.mul(
        new BN(weightedTokens[0]?.weight)
      )
        .div(new BN(scalarA))
        .add(new BN(1));

      expectedADiff = expectedADiff.lte(new BN(0)) ? new BN(1) : expectedADiff;

      assert(actualTokenABalDiff.eq(new BN(expectedADiff)));

      const tokenBBalAfter = (
        await getTokenAccount(coherenceHelper.provider, tokenBATA)
      ).amount;

      const actualTokenBBalDiff = tokenBBalBefore.sub(new BN(tokenBBalAfter));

      if (!weightedTokens[1]?.weight) {
        return new Error("weight B undefined");
      }

      const scalarB = new BN(10).pow(new BN(PRISM_ETF_DECIMALS));

      let expectedBDiff = AMOUNT_TO_CONSTRUCT.mul(
        new BN(weightedTokens[1]?.weight)
      )
        .div(new BN(scalarB))
        .add(new BN(1));

      expectedBDiff = expectedBDiff.lte(new BN(0)) ? new BN(1) : expectedBDiff;

      assert(actualTokenBBalDiff.eq(new BN(expectedBDiff)));

      if (!orderState?.transferredTokens) {
        return new Error("Transferred Tokens undefined");
      }

      transferredTokens = await coherenceHelper.sdk.fetchTransferredTokens(
        orderState?.transferredTokens
      );

      if (!transferredTokens?.transferredTokens) {
        return new Error("Transferred Tokens Array undefined");
      }

      transferredTokensArr = transferredTokens.transferredTokens;

      for (let i = 0; i < transferredTokens.length; i++) {
        expect(transferredTokensArr[i]).to.be.true;
      }

      const manager = (
        await coherenceHelper.sdk.fetchPrismEtfDataFromSeeds({
          beamsplitter: coherenceHelper.beamsplitter,
          prismEtfMint,
        })
      )?.manager;

      if (!manager) {
        return new Error("Manager undefined");
      }

      const finalizeOrder = await coherenceHelper.sdk.finalizeOrder({
        beamsplitter: coherenceHelper.beamsplitter,
        prismEtfMint,
        transferredTokens: _transferredTokens,
        manager,
        orderStateId: _id,
      });

      await expectTX(finalizeOrder).to.be.fulfilled;

      const etfBalanceAfter = (
        await getTokenAccount(coherenceHelper.provider, etfATAAddress)
      ).amount;

      const etfBalanceDiff = etfBalanceAfter.sub(etfBalanceBefore);

      assert(etfBalanceDiff.eq(AMOUNT_TO_CONSTRUCT));

      orderState = await coherenceHelper.sdk.fetchOrderStateDataFromSeeds({
        beamsplitter: coherenceHelper.beamsplitter,
        prismEtfMint,
        id: _id,
      });

      expect(enumLikeToString(orderState?.status)).to.be.equal("succeeded");

      if (!orderState?.transferredTokens) {
        return new Error("Transferred Tokens undefined");
      }

      transferredTokens = await coherenceHelper.sdk.fetchTransferredTokens(
        orderState?.transferredTokens
      );

      if (!transferredTokens?.transferredTokens) {
        return new Error("Transferred Tokens Array undefined");
      }

      transferredTokensArr = transferredTokens.transferredTokens;

      for (let i = 0; i < transferredTokens.length; i++) {
        expect(transferredTokensArr[i]).to.be.true;
      }
    });

    /*it(`Validate amounts`, async () => {
      console.log("here");
      const _scalar =
        10 ** (await getMintInfo(provider, prismEtfMint)).decimals;
      const AMOUNT_TO_CONSTRUCT = new BN(1).mul(new BN(_scalar));
      console.log("here2");
      const startOrder = await coherenceHelper.sdk.startOrder({
        beamsplitter: coherenceHelper.beamsplitter,
        prismEtfMint,
        type: OrderType.DECONSTRUCTION,
        amount: AMOUNT_TO_CONSTRUCT,
        transferredTokens: transferredTokensAcct,
      });
      console.log("here3");
      await expectTX(startOrder).to.be.fulfilled;
      const [prismETF] = await generatePrismEtfAddress(
        prismEtfMint,
        beamsplitter
      );
      console.log("here4");
      const cohere = await coherenceHelper.sdk.cohere({
        beamsplitter: coherenceHelper.beamsplitter,
        prismEtfMint,
        transferredTokens: transferredTokensAcct,
        orderStateAmount: AMOUNT_TO_CONSTRUCT,
      });
      await Promise.all(
        cohere.map((cohereChunk) => expectTX(cohereChunk).to.be.fulfilled)
      );
      console.log("here5");
      const beamsplitterBAta = await getATAAddress({
        mint: tokenBATA,
        owner: beamsplitter: coherenceHelper.beamsplitter,
      });
      console.log("here6");
      const tokenBBalBefore = (
        await getTokenAccount(provider, beamsplitterBAta)
      ).amount;
      console.log("here7");
      const tokenBBalAfter = (await getTokenAccount(provider, beamsplitterBAta))
        .amount;
      console.log(tokenBBalBefore.toString());
      //console.log(tokenBBalAfter.toString());
      const manager = (
        await coherenceHelper.sdk.fetchPrismEtfDataFromSeeds({ beamsplitter: coherenceHelper.beamsplitter, prismEtfMint })
      )?.manager;
      if (!manager) {
        return new Error("Manager undefined");
      }
      console.log("here8");
      const finalizeOrderPre = await coherenceHelper.sdk.finalizeOrder({
        beamsplitter: coherenceHelper.beamsplitter,
        prismEtfMint,
        transferredTokens: transferredTokensAcct,
        manager,
      });
      console.log("here");
      await expectTX(finalizeOrderPre).to.be.fulfilled;
      //console.log(tokenBBalBefore.toString());
      //console.log(tokenBBalAfter.toString());
    });*/

    it(`Cancel DECONSTRUCT order`, async () => {
      const _scalar =
        10 **
        (await getMintInfo(coherenceHelper.provider, prismEtfMint)).decimals;
      const AMOUNT_TO_DECONSTRUCT = new BN(1).mul(new BN(_scalar));

      const prismEtf = await coherenceHelper.sdk.fetchPrismEtfDataFromSeeds({
        beamsplitter: coherenceHelper.beamsplitter,
        prismEtfMint,
      });

      if (!prismEtf) {
        assert.fail("Prism Etf was not successfully created");
      }

      // ==== CONSTRUCT TOKENS (Prerequisite) ====

      const [prestartOrder, _id] = await coherenceHelper.sdk.startOrder({
        beamsplitter: coherenceHelper.beamsplitter,
        prismEtfMint,
        type: OrderType.CONSTRUCTION,
        amount: AMOUNT_TO_DECONSTRUCT,
        transferredTokens: transferredTokensAcct,
      });

      await expectTX(prestartOrder).to.be.fulfilled;

      const cohere = await coherenceHelper.sdk.cohere({
        beamsplitter: coherenceHelper.beamsplitter,
        prismEtfMint,
        transferredTokens: transferredTokensAcct,
        orderStateAmount: AMOUNT_TO_DECONSTRUCT,
        orderStateId: _id,
      });

      await Promise.all(
        cohere.map((cohereChunk) => expectTX(cohereChunk).to.be.fulfilled)
      );

      const manager = (
        await coherenceHelper.sdk.fetchPrismEtfDataFromSeeds({
          beamsplitter: coherenceHelper.beamsplitter,
          prismEtfMint,
        })
      )?.manager;

      if (!manager) {
        return new Error("Manager undefined");
      }

      const finalizeOrderPre = await coherenceHelper.sdk.finalizeOrder({
        beamsplitter: coherenceHelper.beamsplitter,
        prismEtfMint,
        transferredTokens: transferredTokensAcct,
        manager,
        orderStateId: _id,
      });

      await expectTX(finalizeOrderPre).to.be.fulfilled;

      // ==== START =====

      const tokenBBalBefore = (
        await getTokenAccount(coherenceHelper.provider, tokenBATA)
      ).amount;

      const etfATAAddress = await getATAAddress({
        mint: prismEtfMint,
        owner: coherenceHelper.authority,
      });

      const etfBalanceBeforeOrderer = (
        await getTokenAccount(coherenceHelper.provider, etfATAAddress)
      ).amount;

      const [startOrder] = await coherenceHelper.sdk.startOrder({
        beamsplitter: coherenceHelper.beamsplitter,
        prismEtfMint,
        type: OrderType.DECONSTRUCTION,
        amount: AMOUNT_TO_DECONSTRUCT,
        transferredTokens: transferredTokensAcct,
      });

      await expectTX(startOrder).to.be.fulfilled;
      // ==== DECOHERE =====

      const decohere = await coherenceHelper.sdk.decohere({
        beamsplitter: coherenceHelper.beamsplitter,
        prismEtfMint,
        transferredTokens: transferredTokensAcct,
        orderStateId: _id,
      });

      if (!decohere[1]) {
        assert.fail("Cohere 0 does not exist");
      }

      await expectTX(decohere[1]).to.be.fulfilled;

      // ==== CANCEL =====

      const cancel = await coherenceHelper.sdk.cancel({
        beamsplitter: coherenceHelper.beamsplitter,
        prismEtfMint,
        orderStateId: _id,
      });
      await Promise.all(cancel.map((chunk) => expectTX(chunk).to.be.fulfilled));

      // ==== FINALIZE =====

      const finalizeOrder = await coherenceHelper.sdk.finalizeOrder({
        beamsplitter: coherenceHelper.beamsplitter,
        prismEtfMint,
        transferredTokens: transferredTokensAcct,
        manager,
        orderStateId: _id,
      });

      await expectTX(finalizeOrder).to.be.fulfilled;

      // ==== CHECK ETF BALANCE DIFF =====

      const expectedOrdererDiff = new BN(0);

      const etfBalanceAfterOrderer = (
        await getTokenAccount(coherenceHelper.provider, etfATAAddress)
      ).amount;

      const actualOrdererDiff = etfBalanceAfterOrderer.sub(
        etfBalanceBeforeOrderer
      );

      assert(expectedOrdererDiff.eq(actualOrdererDiff));

      // ==== CHECK TOKEN B BALANCE DIFF =====

      const tokenBBalAfter = (
        await getTokenAccount(coherenceHelper.provider, tokenBATA)
      ).amount;

      const actualTokenBBalDiff = tokenBBalAfter.sub(new BN(tokenBBalBefore));

      if (!weightedTokens[1]?.weight) {
        return new Error("weight B undefined");
      }

      const expectedBDiff = new BN(-1);

      assert(actualTokenBBalDiff.eq(expectedBDiff));
    });

    it(`Deconstruct two asset Prism ETF`, async () => {
      const _scalar =
        10 **
        (await getMintInfo(coherenceHelper.provider, prismEtfMint)).decimals;
      const AMOUNT_TO_DECONSTRUCT = new BN(1).mul(new BN(_scalar));

      const tokenABalBefore = (
        await getTokenAccount(coherenceHelper.provider, tokenAATA)
      ).amount;

      const tokenBBalBefore = (
        await getTokenAccount(coherenceHelper.provider, tokenBATA)
      ).amount;

      // TODO rename this
      const [, _id] = await coherenceHelper.sdk.getNextAvailableOrderState({
        beamsplitter: coherenceHelper.beamsplitter,
        prismEtfMint,
      });

      let orderState = await coherenceHelper.sdk.fetchOrderStateDataFromSeeds({
        beamsplitter: coherenceHelper.beamsplitter,
        prismEtfMint,
        id: _id,
      });

      expect(orderState?.transferredTokens).to.not.be.undefined;
      expect(enumLikeToString(orderState?.status)).to.be.equal("succeeded");

      const etfATAAddress = await getATAAddress({
        mint: prismEtfMint,
        owner: coherenceHelper.authority,
      });

      const etfBalanceBefore = (
        await getTokenAccount(coherenceHelper.provider, etfATAAddress)
      ).amount;

      const [startOrder] = await coherenceHelper.sdk.startOrder({
        beamsplitter: coherenceHelper.beamsplitter,
        prismEtfMint,
        type: OrderType.DECONSTRUCTION,
        amount: AMOUNT_TO_DECONSTRUCT,
        transferredTokens: transferredTokensAcct,
      });

      await expectTX(startOrder).to.be.fulfilled;

      if (!orderState?.transferredTokens) {
        return new Error("Transferred Tokens undefined");
      }

      let transferredTokens = await coherenceHelper.sdk.fetchTransferredTokens(
        orderState?.transferredTokens
      );

      if (!transferredTokens?.transferredTokens) {
        return new Error("Transferred Tokens Array undefined");
      }

      let transferredTokensArr = transferredTokens.transferredTokens;

      for (let i = 0; i < transferredTokens.length; i++) {
        expect(transferredTokensArr[i]).to.be.true;
      }

      assert(
        coherenceHelper.authority.equals(
          coherenceHelper.sdk.provider.wallet.publicKey
        )
      );

      orderState = await coherenceHelper.sdk.fetchOrderStateDataFromSeeds({
        beamsplitter: coherenceHelper.beamsplitter,
        prismEtfMint,
        id: _id,
      });

      assert(orderState?.amount.eq(new BN(AMOUNT_TO_DECONSTRUCT)));
      expect(enumLikeToString(orderState?.status)).to.be.equal("pending");
      expect(enumLikeToString(orderState?.orderType)).to.be.equal(
        "deconstruction"
      );

      const decohere = await coherenceHelper.sdk.decohere({
        beamsplitter: coherenceHelper.beamsplitter,
        prismEtfMint,
        transferredTokens: transferredTokensAcct,
        orderStateId: _id,
      });

      await Promise.all(
        decohere.map((decohereChunk) => expectTX(decohereChunk).to.be.fulfilled)
      );

      const tokenABalAfter = (
        await getTokenAccount(coherenceHelper.provider, tokenAATA)
      ).amount;

      const actualTokenABalDiff = tokenABalAfter.sub(new BN(tokenABalBefore));

      if (!weightedTokens[0]?.weight) {
        return new Error("weight A undefined");
      }

      const scalarA = new BN(10).pow(new BN(PRISM_ETF_DECIMALS));

      const expectedADiff = AMOUNT_TO_DECONSTRUCT.mul(
        new BN(weightedTokens[0]?.weight)
      ).div(new BN(scalarA));

      assert(actualTokenABalDiff.eq(new BN(expectedADiff)));

      const tokenBBalAfter = (
        await getTokenAccount(coherenceHelper.provider, tokenBATA)
      ).amount;

      const actualTokenBBalDiff = tokenBBalAfter.sub(new BN(tokenBBalBefore));

      if (!weightedTokens[1]?.weight) {
        return new Error("weight B undefined");
      }

      const scalarB = new BN(10).pow(new BN(PRISM_ETF_DECIMALS));

      const expectedBDiff = AMOUNT_TO_DECONSTRUCT.mul(
        new BN(weightedTokens[1]?.weight)
      ).div(new BN(scalarB));

      assert(actualTokenBBalDiff.eq(new BN(expectedBDiff)));

      if (!orderState?.transferredTokens) {
        return new Error("Transferred Tokens undefined");
      }

      transferredTokens = await coherenceHelper.sdk.fetchTransferredTokens(
        orderState?.transferredTokens
      );

      if (!transferredTokens?.transferredTokens) {
        return new Error("Transferred Tokens Array undefined");
      }

      transferredTokensArr = transferredTokens.transferredTokens;

      for (let i = 0; i < transferredTokens.length; i++) {
        expect(transferredTokensArr[i]).to.be.false;
      }

      const manager = (
        await coherenceHelper.sdk.fetchPrismEtfDataFromSeeds({
          beamsplitter: coherenceHelper.beamsplitter,
          prismEtfMint,
        })
      )?.manager;

      if (!manager) {
        return new Error("Manager undefined");
      }

      const finalizeOrder = await coherenceHelper.sdk.finalizeOrder({
        beamsplitter: coherenceHelper.beamsplitter,
        prismEtfMint,
        transferredTokens: transferredTokensAcct,
        manager,
        orderStateId: _id,
      });

      await expectTX(finalizeOrder).to.be.fulfilled;

      const etfBalanceAfter = (
        await getTokenAccount(coherenceHelper.provider, etfATAAddress)
      ).amount;

      const etfBalanceDiff = etfBalanceBefore.sub(etfBalanceAfter);

      assert(etfBalanceDiff.eq(AMOUNT_TO_DECONSTRUCT));

      orderState = await coherenceHelper.sdk.fetchOrderStateDataFromSeeds({
        beamsplitter: coherenceHelper.beamsplitter,
        prismEtfMint,
        id: _id,
      });

      expect(enumLikeToString(orderState?.status)).to.be.equal("succeeded");

      if (!orderState?.transferredTokens) {
        return new Error("Transferred Tokens undefined");
      }

      transferredTokens = await coherenceHelper.sdk.fetchTransferredTokens(
        orderState?.transferredTokens
      );

      if (!transferredTokens?.transferredTokens) {
        return new Error("Transferred Tokens Array undefined");
      }

      transferredTokensArr = transferredTokens.transferredTokens;

      for (let i = 0; i < transferredTokens.length; i++) {
        expect(transferredTokensArr[i]).to.be.false;
      }
    });

    it(`Ensure fee distribution is correct`, async () => {
      const _scalar =
        10 **
        (await getMintInfo(coherenceHelper.provider, prismEtfMint)).decimals;
      const AMOUNT_TO_CONSTRUCT = new BN(1).mul(new BN(_scalar));

      const etfATAAddress = await getATAAddress({
        mint: prismEtfMint,
        owner: coherenceHelper.authority,
      });

      const etfBalanceBeforeOrderer = (
        await getTokenAccount(coherenceHelper.provider, etfATAAddress)
      ).amount;

      const newOwner = Keypair.generate();
      const newManager = Keypair.generate();

      const ownerAta = await getATAAddress({
        mint: prismEtfMint,
        owner: newOwner.publicKey,
      });

      const managerAta = await getATAAddress({
        mint: prismEtfMint,
        owner: newManager.publicKey,
      });

      const etfBalanceBeforeOwner = new BN(0);
      const etfBalanceBeforeManager = new BN(0);

      const setOwner = coherenceHelper.sdk.setOwner({
        beamsplitter: coherenceHelper.beamsplitter,
        newOwner: newOwner.publicKey,
      });

      await expectTX(setOwner).to.be.fulfilled;

      const beamsplitterData = await coherenceHelper.sdk.fetchBeamsplitterData(
        coherenceHelper.beamsplitter
      );
      assert(beamsplitterData?.owner.equals(newOwner.publicKey));

      const setManager = coherenceHelper.sdk.setManager({
        beamsplitter: coherenceHelper.beamsplitter,
        prismEtfMint,
        newManager: newManager.publicKey,
      });

      await expectTX(setManager).to.be.fulfilled;

      const prismEtf = await coherenceHelper.sdk.fetchPrismEtfDataFromSeeds({
        beamsplitter: coherenceHelper.beamsplitter,
        prismEtfMint,
      });

      if (!prismEtf) {
        assert.fail("Prism Etf was not successfully created");
      }

      assert(prismEtf?.manager.equals(newManager.publicKey));

      const [startOrder, _id] = await coherenceHelper.sdk.startOrder({
        beamsplitter: coherenceHelper.beamsplitter,
        prismEtfMint,
        type: OrderType.CONSTRUCTION,
        amount: AMOUNT_TO_CONSTRUCT,
        transferredTokens: transferredTokensAcct,
      });

      await expectTX(startOrder).to.be.fulfilled;

      const cohere = await coherenceHelper.sdk.cohere({
        beamsplitter: coherenceHelper.beamsplitter,
        prismEtfMint,
        transferredTokens: transferredTokensAcct,
        orderStateAmount: AMOUNT_TO_CONSTRUCT,
        orderStateId: _id,
      });

      await Promise.all(
        cohere.map((cohereChunk) => expectTX(cohereChunk).to.be.fulfilled)
      );

      const manager = (
        await coherenceHelper.sdk.fetchPrismEtfDataFromSeeds({
          beamsplitter: coherenceHelper.beamsplitter,
          prismEtfMint,
        })
      )?.manager;

      if (!manager) {
        return new Error("Manager undefined");
      }

      const finalizeOrder = await coherenceHelper.sdk.finalizeOrder({
        beamsplitter: coherenceHelper.beamsplitter,
        prismEtfMint,
        transferredTokens: transferredTokensAcct,
        manager,
        orderStateId: _id,
      });

      await expectTX(finalizeOrder).to.be.fulfilled;

      const etfBalanceAfterOwner = (
        await getTokenAccount(coherenceHelper.provider, ownerAta)
      ).amount;

      const etfBalanceAfterManager = (
        await getTokenAccount(coherenceHelper.provider, managerAta)
      ).amount;

      const etfBalanceAfterOrderer = (
        await getTokenAccount(coherenceHelper.provider, etfATAAddress)
      ).amount;

      const feePortion = AMOUNT_TO_CONSTRUCT.mul(
        new BN(prismEtf.constructionBps)
      ).div(new BN(10 ** 4));

      const expectedOrdererDiff = AMOUNT_TO_CONSTRUCT.sub(feePortion);

      const expectedManagerDiff = feePortion
        .mul(new BN(prismEtf.managerCut))
        .div(new BN(10 ** 4));

      const expectedOwnerDiff = feePortion.sub(expectedManagerDiff);

      const actualOrdererDiff = etfBalanceAfterOrderer.sub(
        etfBalanceBeforeOrderer
      );
      const actualOwnerDiff = etfBalanceAfterOwner.sub(etfBalanceBeforeOwner);
      const actualManagerDiff = etfBalanceAfterManager.sub(
        etfBalanceBeforeManager
      );

      assert(expectedOrdererDiff.eq(actualOrdererDiff));
      assert(expectedOwnerDiff.eq(actualOwnerDiff));
      assert(expectedManagerDiff.eq(actualManagerDiff));
    });

    it(`Cancel CONSTRUCT order`, async () => {
      const _scalar =
        10 **
        (await getMintInfo(coherenceHelper.provider, prismEtfMint)).decimals;
      const AMOUNT_TO_CONSTRUCT = new BN(1).mul(new BN(_scalar));

      const etfATAAddress = await getATAAddress({
        mint: prismEtfMint,
        owner: coherenceHelper.authority,
      });

      const etfBalanceBeforeOrderer = (
        await getTokenAccount(coherenceHelper.provider, etfATAAddress)
      ).amount;

      const prismEtf = await coherenceHelper.sdk.fetchPrismEtfDataFromSeeds({
        beamsplitter: coherenceHelper.beamsplitter,
        prismEtfMint,
      });

      if (!prismEtf) {
        assert.fail("Prism Etf was not successfully created");
      }

      const tokenBBalBefore = (
        await getTokenAccount(coherenceHelper.provider, tokenBATA)
      ).amount;

      // ==== START =====

      const [startOrder, _id] = await coherenceHelper.sdk.startOrder({
        beamsplitter: coherenceHelper.beamsplitter,
        prismEtfMint,
        type: OrderType.CONSTRUCTION,
        amount: AMOUNT_TO_CONSTRUCT,
        transferredTokens: transferredTokensAcct,
      });

      await expectTX(startOrder).to.be.fulfilled;

      const cohere = await coherenceHelper.sdk.cohere({
        beamsplitter: coherenceHelper.beamsplitter,
        prismEtfMint,
        transferredTokens: transferredTokensAcct,
        orderStateAmount: AMOUNT_TO_CONSTRUCT,
        orderStateId: _id,
      });

      // ==== COHERE =====

      if (!cohere[1]) {
        assert.fail("Cohere 0 does not exist");
      }

      await expectTX(cohere[1]).to.be.fulfilled;

      // ==== CANCEL =====

      const cancel = await coherenceHelper.sdk.cancel({
        beamsplitter: coherenceHelper.beamsplitter,
        prismEtfMint,
        orderStateId: _id,
      });
      await Promise.all(cancel.map((chunk) => expectTX(chunk).to.be.fulfilled));

      // ==== FINALIZE =====

      const manager = (
        await coherenceHelper.sdk.fetchPrismEtfDataFromSeeds({
          beamsplitter: coherenceHelper.beamsplitter,
          prismEtfMint,
        })
      )?.manager;

      if (!manager) {
        return new Error("Manager undefined");
      }

      const finalizeOrder = await coherenceHelper.sdk.finalizeOrder({
        beamsplitter: coherenceHelper.beamsplitter,
        prismEtfMint,
        transferredTokens: transferredTokensAcct,
        manager,
        orderStateId: _id,
      });

      await expectTX(finalizeOrder).to.be.fulfilled;

      // ==== CHECK ETF BALANCE DIFF =====

      const expectedOrdererDiff = new BN(0);

      const etfBalanceAfterOrderer = (
        await getTokenAccount(coherenceHelper.provider, etfATAAddress)
      ).amount;

      const actualOrdererDiff = etfBalanceAfterOrderer.sub(
        etfBalanceBeforeOrderer
      );

      assert(expectedOrdererDiff.eq(actualOrdererDiff));

      // ==== CHECK TOKEN B BALANCE DIFF =====

      const tokenBBalAfter = (
        await getTokenAccount(coherenceHelper.provider, tokenBATA)
      ).amount;

      const actualTokenBBalDiff = tokenBBalAfter.sub(new BN(tokenBBalBefore));

      if (!weightedTokens[1]?.weight) {
        return new Error("weight B undefined");
      }

      const expectedBDiff = new BN(-1);

      assert(actualTokenBBalDiff.eq(expectedBDiff));
    });

    it(`Close PrismEtf`, async () => {
      const preSolBal = (
        await coherenceHelper.provider.getAccountInfo(coherenceHelper.authority)
      )?.accountInfo.lamports;

      const [initPrismEtf, testMint, testWeightedTokens] =
        await coherenceHelper.sdk.initPrismEtf({
          beamsplitter: coherenceHelper.beamsplitter,
        });
      await expectTX(initPrismEtf).to.be.fulfilled;

      const pushTokens = await coherenceHelper.sdk.pushTokens({
        beamsplitter: coherenceHelper.beamsplitter,
        prismEtfMint: testMint,
        weightedTokensAcct: testWeightedTokens,
        weightedTokens: [
          {
            mint: new PublicKey(0),
            weight: new BN(1),
          },
        ],
      });
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      await expectTX(pushTokens[0]!).to.be.fulfilled;
      const finalizePrismEtf = await coherenceHelper.sdk.finalizePrismEtf({
        beamsplitter: coherenceHelper.beamsplitter,
        prismEtfMint: testMint,
      });
      await expectTX(finalizePrismEtf).to.be.fulfilled;

      const closePrismEtf = await coherenceHelper.sdk.closePrismEtf({
        prismEtfMint: testMint,
        beamsplitter: coherenceHelper.beamsplitter,
      });

      await expectTX(closePrismEtf).to.be.fulfilled;

      const afterSolBal = (
        await coherenceHelper.provider.getAccountInfo(coherenceHelper.authority)
      )?.accountInfo.lamports;

      const weightedTokensData = await coherenceHelper.sdk.fetchWeightedTokens(
        testWeightedTokens
      );

      const prismEtfTestData =
        await coherenceHelper.sdk.fetchPrismEtfDataFromSeeds({
          beamsplitter: coherenceHelper.beamsplitter,
          prismEtfMint: testMint,
        });

      if (!preSolBal) {
        throw new Error();
      }

      if (!afterSolBal) {
        throw new Error();
      }
      expect(afterSolBal).to.be.not.eq(preSolBal);
      expect(prismEtfTestData).to.be.null;
      expect(weightedTokensData).to.be.null;
    });
  });
});
