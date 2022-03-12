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
  getMintInfo,
  getOrCreateATA,
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
        decimals: 9,
        mintAuthority: authority,
      });

      await expectTX(tokenAMintTx).to.be.fulfilled;

      const tokenBKP = Keypair.generate();
      const tokenBMintTx = await createInitMintInstructions({
        provider,
        mintKP: tokenBKP,
        decimals: 9,
        mintAuthority: authority,
      });

      await expectTX(tokenBMintTx).to.be.fulfilled;

      const weightedTokens: WeightedToken[] = [
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

      const { address: tokenAATA, instruction: createAATA } =
        await getOrCreateATA({
          provider,
          mint: tokenAKP.publicKey,
          owner: authority,
        });

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

      const { address: tokenBATA, instruction: createBATA } =
        await getOrCreateATA({
          provider,
          mint: tokenBKP.publicKey,
          owner: authority,
        });

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
        amount: new BN(1),
      });

      await expectTX(startOrder).to.be.fulfilled;

      const orderState2 = await sdk.fetchOrderStateDataFromSeeds({
        beamsplitter,
        prismEtfMint,
      });

      expect(orderState2?.isPending).to.be.true;
      expect(orderState2?.isConstruction).to.be.equal(true);
    });
  });
});
