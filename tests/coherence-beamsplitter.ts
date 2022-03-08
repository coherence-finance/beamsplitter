import { Provider, setProvider } from "@project-serum/anchor";
import { makeSaberProvider } from "@saberhq/anchor-contrib";
import { chaiSolana, expectTX } from "@saberhq/chai-solana";
import type { Provider as SaberProvider } from "@saberhq/solana-contrib";
import { PendingTransaction, PublicKey } from "@saberhq/solana-contrib";
import { Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import chai, { assert, expect } from "chai";

import type { WeightedToken } from "../src";
import {
  CoherenceBeamsplitterSDK,
  generateBeamsplitterAddress,
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

  /*
  it("Initializes a prism etf", async () => {
    // Defines
    const mintKP = Keypair.generate();
    const mint = mintKP.publicKey;

    const initialSupply = new u64(100);

    const weightedTokens: WeightedToken[] = [
      {
        mint: new PublicKey(0),
        weight: 4,
      },
      {
        mint: new PublicKey(0),
        weight: 1,
      },
      {
        mint: new PublicKey(0),
        weight: 2,
      },
    ];

    const prismEtfKP = Keypair.generate();

    // Register token with 3 assets
    const tx = await sdk.registerToken({
      beamsplitter,
      mintKP,
      authority,
      prismEtfKP,
      authorityKp: testSigner,
      initialSupply,
      weightedTokens,
    });

    await expectTX(tx, "Initialize asset with assetToken").to.be.fulfilled;

    // Verify token data
    //const [tokenKey, bump] = await generatePrismEtfAddress(mint);
    const tokenKey = prismEtfKP.publicKey;
    const tokenData = (await sdk.fetchPrismEtfData(tokenKey)) as PrismEtfData;

    expect(tokenData.prismEtf).to.eqAddress(beamsplitter);
    expect(tokenData.authority).to.eqAddress(authority);
    //expect(tokenData.bump).to.equal(bump);
    expect(tokenData.mint).to.eqAddress(mint);
    // TODO: Add custom deep compare for assets

    // Verify mint authority is properly set to beamsplitter
    const mintAuthorityA = (await getMintInfo(provider, mint))
      .mintAuthority as PublicKey;

    expect(mintAuthorityA).to.eqAddress(beamsplitter);

    // Verify ATA was created
    const ataAddress = await getATAAddress({ mint, owner: beamsplitter });

    assert(
      (await provider.getAccountInfo(ataAddress)) !== null,
      "Ata address does not exist"
    );

    // Verify initial supply
    const tokenAccount = await getTokenAccount(provider, ataAddress);

    assert(
      tokenAccount.amount.eq(initialSupply),
      "Initial supply not allocated"
    );
  });*/

  /*
  it("Print price of BTC/USDC from Raydium MKT Account", async () => {
    const market = "BTC/USDC";

    const pairInfo = {
      address: "A8YFbxQYFVqKZaoYJLLUVcQiWP7G2MeEgW5wsAQgMvFw",
    };

    if (!pairInfo) throw new Error(`Could not locate ${market} in Market Json`);
    const marketAccount: PublicKey = new PublicKey(pairInfo?.address);

    const bidAccount = await sdk.loadMarketAndBidAccounts({
      connection: MAINNET_CONNECTION,
      marketAccount: marketAccount,
    });

    const priceAcc = Keypair.generate();

    await expectTX(
      sdk.getPrice({
        owner: authority,
        price: priceAcc.publicKey,
        priceSigner: priceAcc,
        market: marketAccount,
        bids: bidAccount,
      })
    ).to.be.fulfilled;
  });

  it("Print price of SOL/USDC from Raydium MKT Account", async () => {
    const market = "SOL/USDC";

    const pairInfo = {
      address: "9wFFyRfZBsuAha4YcuxcXLKwMxJR43S7fPfQLusDBzvT",
    };

    if (!pairInfo) throw new Error(`Could not locate ${market} in Market Json`);
    const marketAccount: PublicKey = new PublicKey(pairInfo?.address);

    const bidAccount = await sdk.loadMarketAndBidAccounts({
      connection: MAINNET_CONNECTION,
      marketAccount: marketAccount,
    });

    const priceAcc = Keypair.generate();

    await expectTX(
      sdk.getPrice({
        owner: authority,
        price: priceAcc.publicKey,
        priceSigner: priceAcc,
        market: marketAccount,
        bids: bidAccount,
      })
    ).to.be.fulfilled;
  });

  it("Print price of SOL/USDC from Raydium MKT Account", async () => {
    const market = "SOL/USDC";

    const pairInfo = {
      address: "9wFFyRfZBsuAha4YcuxcXLKwMxJR43S7fPfQLusDBzvT",
    };

    if (!pairInfo) throw new Error(`Could not locate ${market} in Market Json`);
    const marketAccount: PublicKey = new PublicKey(pairInfo?.address);

    const bidAccount = await sdk.loadMarketAndBidAccounts({
      connection: MAINNET_CONNECTION,
      marketAccount: marketAccount,
    });

    const priceAcc = Keypair.generate();

    await expectTX(
      sdk.getPrice({
        owner: authority,
        price: priceAcc.publicKey,
        priceSigner: priceAcc,
        market: marketAccount,
        bids: bidAccount,
      })
    ).to.be.fulfilled;
  });*/

  /* it("Buy an etf", async () => {
    const usdcWallet = await getATAAddress({
      mint: getUSDCMint(),
      owner: authority,
    });

    const tempProv = new Provider(
      provider.connection,
      provider.wallet,
      provider.opts
    );

    // Mint USDC to our addr
    await expectTX(
      new PendingTransaction(
        tempProv.connection,
        await airdropSplTokens({
          provider: tempProv,
          amount: new BN(1),
          to: usdcWallet,
          mintPda: getUSDCMint(),
          mintPdaBump: (
            await PublicKey.findProgramAddress(
              [getUSDCMint().toBuffer()],
              TOKEN_PROGRAM_ID
            )
          )[1],
        })
      )
    ).to.be.fulfilled;

    await sdk.buy({
      beamsplitter,
      prismEtf: new PublicKey(""),
      amount: new BN(1),
    });
  });*/
});
