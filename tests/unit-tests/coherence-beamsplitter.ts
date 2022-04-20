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

import type { UserPrismEtf, WeightedToken } from "../../src";
import {
  enumLikeToString,
  OrderType,
  PRISM_ETF_DECIMALS,
  PrismEtf,
} from "../../src";
import { coherenceHelper } from "../coherenceBeamsplitterTest";

chai.use(chaiSolana);

export default function constructDeconstruct() {
  describe("Construct & Deconstruct", () => {
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
    before(async () => {
      const [initPrismEtFTx, _prismEtfMint, prismEtfPda, weightedTokensAcct] =
        await coherenceHelper.sdk.beamsplitter.initPrismEtf({});

      prismEtfMint = _prismEtfMint;

      await expectTX(initPrismEtFTx, "Initialize asset with assetToken").to.be
        .fulfilled;

      const mintInfo = await getMintInfo(
        coherenceHelper.provider,
        prismEtfMint
      );
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

    it(`Construct two asset Prism ETF`, async () => {
      const AMOUNT_TO_CONSTRUCT = new BN(1800266);

      const tokenABalBefore = (
        await getTokenAccount(coherenceHelper.provider, tokenAATA)
      ).amount;

      const tokenBBalBefore = (
        await getTokenAccount(coherenceHelper.provider, tokenBATA)
      ).amount;

      await refreshPrismEtf();

      const initOrderState = await prismEtf.initOrderState();

      await expectTX(initOrderState).to.be.fulfilled;

      await refreshPrismEtf();

      expect(prismEtf.orderStateData?.transferredTokens).to.not.be.undefined;
      expect(enumLikeToString(prismEtf.orderStateData?.status)).to.be.equal(
        "succeeded"
      );

      const startOrder = await prismEtf.startOrder({
        type: OrderType.CONSTRUCTION,
        amount: AMOUNT_TO_CONSTRUCT,
      });

      await expectTX(startOrder).to.be.fulfilled;

      await refreshPrismEtf();

      if (!prismEtf.orderStateData?.transferredTokens) {
        return new Error("Transferred Tokens undefined");
      }

      if (!prismEtf.transferredTokensData) {
        return new Error("Transferred Tokens undefined");
      }

      for (let i = 0; i < prismEtf.transferredTokensData.length; i++) {
        expect(prismEtf.transferredTokensData.transferredTokens[i]).to.be.false;
      }

      assert(
        coherenceHelper.authority.equals(
          coherenceHelper.sdk.getProvider().walletKey
        )
      );
      const etfATAAddress = await getATAAddress({
        mint: prismEtfMint,
        owner: coherenceHelper.authority,
      });

      const etfBalanceBefore = (
        await getTokenAccount(coherenceHelper.provider, etfATAAddress)
      ).amount;

      assert(prismEtf.orderStateData?.amount.eq(new BN(AMOUNT_TO_CONSTRUCT)));
      expect(enumLikeToString(prismEtf.orderStateData?.status)).to.be.equal(
        "pending"
      );
      expect(enumLikeToString(prismEtf.orderStateData?.orderType)).to.be.equal(
        "construction"
      );

      const cohere = await prismEtf.cohere({
        orderStateAmount: AMOUNT_TO_CONSTRUCT,
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

      await refreshPrismEtf();

      if (!prismEtf.orderStateData?.transferredTokens) {
        return new Error("Transferred Tokens undefined");
      }

      if (!prismEtf.transferredTokensData?.transferredTokens) {
        return new Error("Transferred Tokens Array undefined");
      }

      for (let i = 0; i < prismEtf.transferredTokensData.length; i++) {
        expect(prismEtf.transferredTokensData.transferredTokens[i]).to.be.true;
      }

      if (!prismEtf.prismEtfData?.manager) {
        return new Error("Manager undefined");
      }

      const finalizeOrder = await prismEtf.finalizeOrder({});

      await expectTX(finalizeOrder).to.be.fulfilled;

      const etfBalanceAfter = (
        await getTokenAccount(coherenceHelper.provider, etfATAAddress)
      ).amount;

      const etfBalanceDiff = etfBalanceAfter.sub(etfBalanceBefore);

      assert(etfBalanceDiff.eq(AMOUNT_TO_CONSTRUCT));

      await refreshPrismEtf();

      expect(enumLikeToString(prismEtf.orderStateData?.status)).to.be.equal(
        "succeeded"
      );

      await refreshPrismEtf();

      if (!prismEtf.orderStateData?.transferredTokens) {
        return new Error("Transferred Tokens undefined");
      }

      if (!prismEtf.transferredTokensData?.transferredTokens) {
        return new Error("Transferred Tokens Array undefined");
      }

      for (let i = 0; i < prismEtf.transferredTokensData.length; i++) {
        expect(prismEtf.transferredTokensData.transferredTokens[i]).to.be.true;
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

      await refreshPrismEtf();

      if (!prismEtf) {
        assert.fail("Prism Etf was not successfully created");
      }

      // ==== CONSTRUCT TOKENS (Prerequisite) ====

      const prestartOrder = await prismEtf.startOrder({
        type: OrderType.CONSTRUCTION,
        amount: AMOUNT_TO_DECONSTRUCT,
      });

      await expectTX(prestartOrder).to.be.fulfilled;

      const cohere = await prismEtf.cohere({
        orderStateAmount: AMOUNT_TO_DECONSTRUCT,
      });

      await Promise.all(
        cohere.map((cohereChunk) => expectTX(cohereChunk).to.be.fulfilled)
      );

      if (!prismEtf.prismEtfData?.manager) {
        return new Error("Manager undefined");
      }

      const finalizeOrderPre = await prismEtf.finalizeOrder({});

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

      await refreshPrismEtf();

      const startOrder = await prismEtf.startOrder({
        type: OrderType.DECONSTRUCTION,
        amount: AMOUNT_TO_DECONSTRUCT,
      });

      await expectTX(startOrder).to.be.fulfilled;
      // ==== DECOHERE =====

      const decohere = await prismEtf.decohere({});

      if (!decohere[1]) {
        assert.fail("Cohere 0 does not exist");
      }

      await expectTX(decohere[1]).to.be.fulfilled;

      await refreshPrismEtf();

      // ==== CANCEL =====

      const cancel = await prismEtf.cancel();
      await Promise.all(cancel.map((chunk) => expectTX(chunk).to.be.fulfilled));

      // ==== FINALIZE =====

      const finalizeOrder = await prismEtf.finalizeOrder({});

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

      await refreshPrismEtf();

      expect(prismEtf.orderStateData?.transferredTokens).to.not.be.undefined;
      expect(enumLikeToString(prismEtf.orderStateData?.status)).to.be.equal(
        "succeeded"
      );

      const etfATAAddress = await getATAAddress({
        mint: prismEtfMint,
        owner: coherenceHelper.authority,
      });

      const etfBalanceBefore = (
        await getTokenAccount(coherenceHelper.provider, etfATAAddress)
      ).amount;

      const startOrder = await prismEtf.startOrder({
        type: OrderType.DECONSTRUCTION,
        amount: AMOUNT_TO_DECONSTRUCT,
      });

      await expectTX(startOrder).to.be.fulfilled;

      await refreshPrismEtf();

      if (!prismEtf.orderStateData?.transferredTokens) {
        return new Error("Transferred Tokens undefined");
      }

      if (!prismEtf.transferredTokensData?.transferredTokens) {
        return new Error("Transferred Tokens Array undefined");
      }

      for (let i = 0; i < prismEtf.transferredTokensData.length; i++) {
        expect(prismEtf.transferredTokensData.transferredTokens[i]).to.be.true;
      }

      assert(
        coherenceHelper.authority.equals(
          coherenceHelper.sdk.getProvider().walletKey
        )
      );

      assert(prismEtf.orderStateData?.amount.eq(new BN(AMOUNT_TO_DECONSTRUCT)));
      expect(enumLikeToString(prismEtf.orderStateData?.status)).to.be.equal(
        "pending"
      );
      expect(enumLikeToString(prismEtf.orderStateData?.orderType)).to.be.equal(
        "deconstruction"
      );

      const decohere = await prismEtf.decohere({});

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

      await refreshPrismEtf();

      if (!prismEtf.orderStateData?.transferredTokens) {
        return new Error("Transferred Tokens undefined");
      }

      if (!prismEtf.transferredTokensData?.transferredTokens) {
        return new Error("Transferred Tokens Array undefined");
      }

      for (let i = 0; i < prismEtf.transferredTokensData.length; i++) {
        expect(prismEtf.transferredTokensData.transferredTokens[i]).to.be.false;
      }

      if (!prismEtf.prismEtfData?.manager) {
        return new Error("Manager undefined");
      }

      const finalizeOrder = await prismEtf.finalizeOrder({});

      await expectTX(finalizeOrder).to.be.fulfilled;

      const etfBalanceAfter = (
        await getTokenAccount(coherenceHelper.provider, etfATAAddress)
      ).amount;

      const etfBalanceDiff = etfBalanceBefore.sub(etfBalanceAfter);

      assert(etfBalanceDiff.eq(AMOUNT_TO_DECONSTRUCT));

      await refreshPrismEtf();

      expect(enumLikeToString(prismEtf.orderStateData?.status)).to.be.equal(
        "succeeded"
      );

      if (!prismEtf.orderStateData?.transferredTokens) {
        return new Error("Transferred Tokens undefined");
      }

      if (!prismEtf.transferredTokensData?.transferredTokens) {
        return new Error("Transferred Tokens Array undefined");
      }

      for (let i = 0; i < prismEtf.transferredTokensData.length; i++) {
        expect(prismEtf.transferredTokensData.transferredTokens[i]).to.be.false;
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

      const setOwner = coherenceHelper.sdk.beamsplitter.setOwner({
        newOwner: newOwner.publicKey,
      });

      await expectTX(setOwner).to.be.fulfilled;

      await coherenceHelper.sdk.refreshBeamsplitter();

      assert(
        coherenceHelper.sdk.beamsplitter.beamsplitterData?.owner.equals(
          newOwner.publicKey
        )
      );

      const setManager = prismEtf.setManager({
        newManager: newManager.publicKey,
      });

      await expectTX(setManager).to.be.fulfilled;

      await refreshPrismEtf();

      if (!prismEtf) {
        assert.fail("Prism Etf was not successfully created");
      }

      assert(prismEtf.prismEtfData?.manager.equals(newManager.publicKey));

      const startOrder = await prismEtf.startOrder({
        type: OrderType.CONSTRUCTION,
        amount: AMOUNT_TO_CONSTRUCT,
      });

      await expectTX(startOrder).to.be.fulfilled;

      const cohere = await prismEtf.cohere({
        orderStateAmount: AMOUNT_TO_CONSTRUCT,
      });

      await Promise.all(
        cohere.map((cohereChunk) => expectTX(cohereChunk).to.be.fulfilled)
      );

      await refreshPrismEtf();

      if (!prismEtf.prismEtfData?.manager) {
        return new Error("Manager undefined");
      }

      const finalizeOrder = await prismEtf.finalizeOrder({});

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
        new BN(prismEtf.prismEtfData.constructionBps)
      ).div(new BN(10 ** 4));

      const expectedOrdererDiff = AMOUNT_TO_CONSTRUCT.sub(feePortion);

      const expectedManagerDiff = feePortion
        .mul(new BN(prismEtf.prismEtfData.managerCut))
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

      await refreshPrismEtf();

      if (!prismEtf.prismEtfData) {
        assert.fail("Prism Etf was not successfully created");
      }

      const tokenBBalBefore = (
        await getTokenAccount(coherenceHelper.provider, tokenBATA)
      ).amount;

      // ==== START =====

      const startOrder = await prismEtf.startOrder({
        type: OrderType.CONSTRUCTION,
        amount: AMOUNT_TO_CONSTRUCT,
      });

      await expectTX(startOrder).to.be.fulfilled;

      const cohere = await prismEtf.cohere({
        orderStateAmount: AMOUNT_TO_CONSTRUCT,
      });

      // ==== COHERE =====

      if (!cohere[1]) {
        assert.fail("Cohere 0 does not exist");
      }

      await expectTX(cohere[1]).to.be.fulfilled;

      await refreshPrismEtf();

      // ==== CANCEL =====

      const cancel = await prismEtf.cancel();
      await Promise.all(cancel.map((chunk) => expectTX(chunk).to.be.fulfilled));

      // ==== FINALIZE =====

      await refreshPrismEtf();

      if (!prismEtf.prismEtfData.manager) {
        return new Error("Manager undefined");
      }

      const finalizeOrder = await prismEtf.finalizeOrder({});

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

      const [initPrismEtf, testMint, prismEtfPda, testWeightedTokens] =
        await coherenceHelper.sdk.beamsplitter.initPrismEtf({});
      await expectTX(initPrismEtf).to.be.fulfilled;

      prismEtfMint = testMint;

      await refreshPrismEtf();

      const pushTokens = await coherenceHelper.sdk.beamsplitter.pushTokens({
        prismEtfMint,
        prismEtfPda,
        weightedTokensAcct: testWeightedTokens,
        weightedTokens: [
          {
            mint: new PublicKey(0),
            weight: new BN(1),
          },
        ],
        shouldCreateAtas: false,
      });
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      await expectTX(pushTokens[0]!).to.be.fulfilled;
      const finalizePrismEtf =
        await coherenceHelper.sdk.beamsplitter.finalizePrismEtf({
          prismEtfMint,
          prismEtfPda,
        });
      await expectTX(finalizePrismEtf).to.be.fulfilled;

      const closePrismEtf = prismEtf.closePrismEtf();

      await expectTX(closePrismEtf).to.be.fulfilled;

      const afterSolBal = (
        await coherenceHelper.provider.getAccountInfo(coherenceHelper.authority)
      )?.accountInfo.lamports;

      await refreshPrismEtf();

      if (!preSolBal) {
        throw new Error();
      }

      if (!afterSolBal) {
        throw new Error();
      }
      expect(afterSolBal).to.be.not.eq(preSolBal);
      expect(prismEtf.prismEtfData).to.be.null;
      expect(prismEtf.weightedTokensData).to.be.null;
    });
  });
}
