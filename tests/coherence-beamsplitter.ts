import { Provider, setProvider } from "@project-serum/anchor";
import { makeSaberProvider } from "@saberhq/anchor-contrib";
import { chaiSolana, expectTX } from "@saberhq/chai-solana";
import type { Provider as SaberProvider } from "@saberhq/solana-contrib";
import {
  PendingTransaction,
  PublicKey,
  TransactionEnvelope,
} from "@saberhq/solana-contrib";
import { Keypair, LAMPORTS_PER_SOL, SystemProgram } from "@solana/web3.js";
import chai, { assert, expect } from "chai";

import type { WeightedToken } from "../src";
import {
  CoherenceBeamsplitterSDK,
  generateBeamsplitterAddress,
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
    Math.floor((Math.random() * WEIGHTED_TOKENS_CAPACITY) / 30) + 1;
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
});
