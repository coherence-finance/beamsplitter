/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Provider, setProvider } from "@project-serum/anchor";
import { makeSaberProvider } from "@saberhq/anchor-contrib";
import { chaiSolana, expectTX } from "@saberhq/chai-solana";
import type { Provider as SaberProvider } from "@saberhq/solana-contrib";
import {
  PendingTransaction,
  PublicKey,
  TransactionEnvelope,
} from "@saberhq/solana-contrib";
import {
  createInitMintInstructions,
  createMintToInstruction,
  getATAAddress,
  getMintInfo,
  getOrCreateATA,
  getTokenAccount,
  u64,
} from "@saberhq/token-utils";
import { Keypair, LAMPORTS_PER_SOL, SystemProgram } from "@solana/web3.js";
import { BN } from "bn.js";
import chai, { assert, expect } from "chai";

import type { WeightedToken } from "../src";
import {
  CoherenceBeamsplitterSDK,
  generateBeamsplitterAddress,
  generateOrderStateAddress,
  generatePrismEtfAddress,
  WEIGHTED_TOKENS_CAPACITY,
} from "../src";

chai.use(chaiSolana);

describe("coherence-beamsplitter", () => {
  // Provider setup
  const anchorProvider = Provider.env();
  setProvider(anchorProvider);

  const testSigner = Keypair.generate();

  const provider: SaberProvider = makeSaberProvider(anchorProvider);
  const sdk: CoherenceBeamsplitterSDK = CoherenceBeamsplitterSDK.loadWithSigner(
    {
      provider,
      signer: testSigner,
    }
  );

  // Helper variables
  let authority: PublicKey;
  let beamsplitter: PublicKey;

  // Unit tests
  it("Initialize test state", async () => {
    authority = testSigner.publicKey;

    await expectTX(
      new PendingTransaction(
        provider.connection,
        await provider.connection.requestAirdrop(
          authority,
          LAMPORTS_PER_SOL * 100
        )
      )
    ).to.be.fulfilled;
  });

  it("Initialize beamsplitter program state", async () => {
    // Initialize prism
    const tx = await sdk.initialize({ owner: authority });

    await expectTX(
      tx,
      "Initialize beamsplitter program state with owner as invoker."
    ).to.be.fulfilled;

    // Verify beamsplitter data
    const [pdaKey, bump] = await generateBeamsplitterAddress();
    const beamsplitterData = await sdk.fetchBeamsplitterData(pdaKey);

    expect(beamsplitterData?.owner).to.eqAddress(authority);
    expect(beamsplitterData?.bump).to.equal(bump);

    beamsplitter = pdaKey;
  });

  it("Reintialization attack should fail", async () => {
    const [initPrismEtFTx, prismEtfMint] = await sdk.initPrismEtf({
      beamsplitter,
    });

    await expectTX(initPrismEtFTx, "Initialize asset with assetToken").to.be
      .fulfilled;

    const prismEtf = await sdk.fetchPrismEtfDataFromSeeds({
      beamsplitter,
      prismEtfMint,
    });

    if (!prismEtf) {
      assert.fail("Prism Etf was not successfully created");
    }

    assert(prismEtf.manager.equals(authority));
    assert(!prismEtf.isFinished);

    const [prismEtfPda, bump] = await generatePrismEtfAddress(
      prismEtfMint,
      beamsplitter
    );

    const initPrismEtfAgainTx = new TransactionEnvelope(provider, [
      sdk.program.instruction.initPrismEtf(bump, {
        accounts: {
          prismEtf: prismEtfPda,
          prismEtfMint,
          weightedTokens: prismEtf.weightedTokens,
          manager: authority,
          beamsplitter: beamsplitter,
          systemProgram: SystemProgram.programId,
        },
      }),
    ]);

    await expectTX(initPrismEtfAgainTx).to.be.rejectedWith(
      "Signature verification failed"
    );
  });

  it("Create an empty Prism ETF", async () => {
    const [initPrismEtFTx, prismEtfMint] = await sdk.initPrismEtf({
      beamsplitter,
    });

    await expectTX(initPrismEtFTx, "Initialize asset with assetToken").to.be
      .fulfilled;

    let prismEtf = await sdk.fetchPrismEtfDataFromSeeds({
      beamsplitter,
      prismEtfMint,
    });

    if (!prismEtf) {
      assert.fail("Prism Etf was not successfully created");
    }

    assert(prismEtf.manager.equals(authority));
    assert(!prismEtf.isFinished);

    const finalizePrismEtfTx = await sdk.finalizePrismEtf({
      beamsplitter,
      prismEtfMint,
    });

    await expectTX(finalizePrismEtfTx, "Finalize PrismEtf").to.be.fulfilled;

    prismEtf = await sdk.fetchPrismEtfDataFromSeeds({
      beamsplitter,
      prismEtfMint,
    });

    if (!prismEtf) {
      assert.fail("Prism Etf was not successfully created");
    }

    assert(prismEtf.isFinished);
  });

  const randomNumberTokens =
    Math.floor((Math.random() * WEIGHTED_TOKENS_CAPACITY) / 40) + 1;
  it(`Create a Prism ETF with ${randomNumberTokens} asset(s)`, async () => {
    const [initPrismEtFTx, prismEtfMint] = await sdk.initPrismEtf({
      beamsplitter,
    });

    await expectTX(initPrismEtFTx, "Initialize asset with assetToken").to.be
      .fulfilled;

    let prismEtf = await sdk.fetchPrismEtfDataFromSeeds({
      beamsplitter,
      prismEtfMint,
    });

    if (!prismEtf) {
      assert.fail("Prism Etf was not successfully created");
    }

    assert(prismEtf.manager.equals(authority));
    assert(!prismEtf.isFinished);

    const weightedTokens: WeightedToken[] = [];
    for (let i = 0; i < randomNumberTokens; i++) {
      weightedTokens.push({
        mint: new PublicKey(i),
        weight: i,
      });
    }

    const pushTokensEnvelopes = await sdk.pushTokens({
      beamsplitter,
      weightedTokens,
      prismEtfMint,
    });

    // Have to do pushing in seq (Promise.all is not an option)
    for (const pushTokensEnvelope of pushTokensEnvelopes) {
      await expectTX(pushTokensEnvelope).to.be.fulfilled;
    }
    const weightedTokenData = await sdk.fetchWeightedTokens(
      prismEtf.weightedTokens
    );
    expect(weightedTokenData?.index).to.be.equal(randomNumberTokens);

    for (let i = 0; i < randomNumberTokens; i++) {
      assert(
        weightedTokenData?.weightedTokens[i]?.mint.equals(new PublicKey(i))
      );
      expect(weightedTokenData?.weightedTokens[i]?.weight).to.be.equal(i);
    }

    const finalizePrismEtfTx = await sdk.finalizePrismEtf({
      beamsplitter,
      prismEtfMint,
    });

    await expectTX(finalizePrismEtfTx, "Finalize PrismEtf").to.be.fulfilled;

    prismEtf = await sdk.fetchPrismEtfDataFromSeeds({
      beamsplitter,
      prismEtfMint,
    });

    if (!prismEtf) {
      assert.fail("Prism Etf was not successfully created");
    }

    assert(prismEtf.isFinished);
  });

  describe("Construct & Deconstruct", () => {
    let prismEtfMint: PublicKey;
    let tokenAATA: PublicKey;
    let tokenAMint: PublicKey;
    let tokenBATA: PublicKey;
    let tokenBMint: PublicKey;
    const decimals = 9;
    let weightedTokens: WeightedToken[];

    /*
    1. Setup 2 Token Mints
    2. Create PrismETF
    3. Mint 100 of each token to testSigner.publicKey
    */
    before(async () => {
      const [initPrismEtFTx, _prismEtfMint] = await sdk.initPrismEtf({
        beamsplitter,
      });

      prismEtfMint = _prismEtfMint;

      await expectTX(initPrismEtFTx, "Initialize asset with assetToken").to.be
        .fulfilled;

      const mintInfo = await getMintInfo(provider, prismEtfMint);
      assert(mintInfo.mintAuthority?.equals(beamsplitter));

      let prismEtf = await sdk.fetchPrismEtfDataFromSeeds({
        beamsplitter,
        prismEtfMint,
      });

      if (!prismEtf) {
        assert.fail("Prism Etf was not successfully created");
      }

      assert(prismEtf.manager.equals(authority));
      assert(!prismEtf.isFinished);

      const tokenAKP = Keypair.generate();
      const tokenAMintTx = await createInitMintInstructions({
        provider,
        mintKP: tokenAKP,
        decimals,
        mintAuthority: authority,
      });

      tokenAMint = tokenAKP.publicKey;
      await expectTX(tokenAMintTx).to.be.fulfilled;

      const tokenBKP = Keypair.generate();
      const tokenBMintTx = await createInitMintInstructions({
        provider,
        mintKP: tokenBKP,
        decimals,
        mintAuthority: authority,
      });

      tokenBMint = tokenBKP.publicKey;
      await expectTX(tokenBMintTx).to.be.fulfilled;

      weightedTokens = [
        {
          mint: tokenAKP.publicKey,
          weight: 1,
        },
        {
          mint: tokenBKP.publicKey,
          weight: 2,
        },
      ];
      const pushTokensEnvelopes = await sdk.pushTokens({
        beamsplitter,
        weightedTokens,
        prismEtfMint,
      });

      // Have to do pushing in seq (Promise.all is not an option)
      for (const pushTokensEnvelope of pushTokensEnvelopes) {
        await expectTX(pushTokensEnvelope).to.be.fulfilled;
      }

      const weightedTokenData = await sdk.fetchWeightedTokens(
        prismEtf.weightedTokens
      );

      expect(weightedTokenData?.index).to.be.equal(2);

      const finalizePrismEtfTx = await sdk.finalizePrismEtf({
        beamsplitter,
        prismEtfMint,
      });

      await expectTX(finalizePrismEtfTx, "Finalize PrismEtf").to.be.fulfilled;

      prismEtf = await sdk.fetchPrismEtfDataFromSeeds({
        beamsplitter,
        prismEtfMint,
      });

      if (!prismEtf) {
        assert.fail("Prism Etf was not successfully created");
      }

      assert(prismEtf.isFinished);

      const { address: _tokenAATA, instruction: createAATA } =
        await getOrCreateATA({
          provider,
          mint: tokenAKP.publicKey,
          owner: authority,
        });

      tokenAATA = _tokenAATA;
      if (createAATA) {
        await expectTX(new TransactionEnvelope(provider, [createAATA])).to.be
          .fulfilled;
      }

      const tokenAToTx = createMintToInstruction({
        provider,
        mint: tokenAKP.publicKey,
        mintAuthorityKP: testSigner,
        to: tokenAATA,
        amount: new u64(100 * 10 ** 9),
      });

      await expectTX(tokenAToTx).to.be.fulfilled;

      const { address: _tokenBATA, instruction: createBATA } =
        await getOrCreateATA({
          provider,
          mint: tokenBKP.publicKey,
          owner: authority,
        });

      tokenBATA = _tokenBATA;
      if (createBATA) {
        await expectTX(new TransactionEnvelope(provider, [createBATA])).to.be
          .fulfilled;
      }

      const tokenBToTx = createMintToInstruction({
        provider,
        mint: tokenBKP.publicKey,
        mintAuthorityKP: testSigner,
        to: tokenBATA,
        amount: new u64(100 * 10 ** 9),
      });

      await expectTX(tokenBToTx).to.be.fulfilled;
    });

    it(`Construct two asset Prism ETF`, async () => {
      const _scalar =
        10 ** (await getMintInfo(provider, prismEtfMint)).decimals;
      const AMOUNT_TO_CONSTRUCT = new BN(1).mul(new BN(_scalar));

      const tokenABalBefore = (await getTokenAccount(provider, tokenAATA))
        .amount;

      const tokenBBalBefore = (await getTokenAccount(provider, tokenBATA))
        .amount;

      const [, bump] = await generateOrderStateAddress(
        prismEtfMint,
        beamsplitter,
        authority
      );

      const initOrderState = await sdk.initOrderState({
        beamsplitter,
        prismEtfMint,
      });

      await expectTX(initOrderState).to.be.fulfilled;

      let orderState = await sdk.fetchOrderStateDataFromSeeds({
        beamsplitter,
        prismEtfMint,
      });

      expect(orderState?.transferredTokens).to.not.be.undefined;
      expect(orderState?.isPending).to.be.false;
      expect(orderState?.bump).to.be.equal(bump);

      const startOrder = await sdk.startOrder({
        beamsplitter,
        prismEtfMint,
        isConstruction: true,
        amount: AMOUNT_TO_CONSTRUCT,
      });

      await expectTX(startOrder).to.be.fulfilled;

      assert(authority.equals(sdk.provider.wallet.publicKey));
      const etfATAAddress = await getATAAddress({
        mint: prismEtfMint,
        owner: authority,
      });

      const etfBalanceBefore = (await getTokenAccount(provider, etfATAAddress))
        .amount;

      orderState = await sdk.fetchOrderStateDataFromSeeds({
        beamsplitter,
        prismEtfMint,
      });

      assert(orderState?.amount.eq(new BN(AMOUNT_TO_CONSTRUCT)));
      expect(orderState?.isPending).to.be.true;
      expect(orderState?.isConstruction).to.be.equal(true);

      const cohere = await sdk.cohere({
        beamsplitter,
        prismEtfMint,
      });

      await Promise.all(
        cohere.map((cohereChunk) => expectTX(cohereChunk).to.be.fulfilled)
      );

      const tokenABalAfter = (await getTokenAccount(provider, tokenAATA))
        .amount;

      const actualTokenABalDiff = tokenABalBefore.sub(new BN(tokenABalAfter));

      if (!weightedTokens[0]?.weight) {
        return new Error("weight A undefined");
      }

      const scalarA = 10 ** -(await getMintInfo(provider, tokenAMint)).decimals;

      const expectedADiff =
        AMOUNT_TO_CONSTRUCT.toNumber() * weightedTokens[0]?.weight * scalarA;

      assert(actualTokenABalDiff.eq(new BN(expectedADiff)));

      const tokenBBalAfter = (await getTokenAccount(provider, tokenBATA))
        .amount;

      const actualTokenBBalDiff = tokenBBalBefore.sub(new BN(tokenBBalAfter));

      if (!weightedTokens[1]?.weight) {
        return new Error("weight B undefined");
      }

      const scalarB = 10 ** -(await getMintInfo(provider, tokenBMint)).decimals;

      const expectedBDiff =
        AMOUNT_TO_CONSTRUCT.toNumber() * weightedTokens[1]?.weight * scalarB;
      assert(actualTokenBBalDiff.eq(new BN(expectedBDiff)));

      if (!orderState?.transferredTokens) {
        return new Error("Transferred Tokens undefined");
      }

      let transferredTokens = await sdk.fetchTransferredTokens(
        orderState?.transferredTokens
      );

      if (!transferredTokens?.transferredTokens) {
        return new Error("Transferred Tokens Array undefined");
      }

      let transferredTokensArr = transferredTokens.transferredTokens;

      for (let i = 0; i < transferredTokens.index; i++) {
        expect(transferredTokensArr[i]).to.be.true;
      }

      const finalizeOrder = await sdk.finalizeOrder({
        beamsplitter,
        prismEtfMint,
      });

      await expectTX(finalizeOrder).to.be.fulfilled;

      const etfBalanceAfter = (await getTokenAccount(provider, etfATAAddress))
        .amount;

      const etfBalanceDiff = etfBalanceAfter.sub(etfBalanceBefore);

      assert(etfBalanceDiff.eq(AMOUNT_TO_CONSTRUCT));

      orderState = await sdk.fetchOrderStateDataFromSeeds({
        beamsplitter,
        prismEtfMint,
      });

      expect(orderState?.isPending).to.be.false;

      if (!orderState?.transferredTokens) {
        return new Error("Transferred Tokens undefined");
      }

      transferredTokens = await sdk.fetchTransferredTokens(
        orderState?.transferredTokens
      );

      if (!transferredTokens?.transferredTokens) {
        return new Error("Transferred Tokens Array undefined");
      }

      transferredTokensArr = transferredTokens.transferredTokens;

      for (let i = 0; i < transferredTokens.index; i++) {
        expect(transferredTokensArr[i]).to.be.false;
      }
    });
  });
});
