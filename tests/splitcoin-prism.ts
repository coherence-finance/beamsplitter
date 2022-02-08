import { Provider, setProvider } from "@project-serum/anchor";
import { makeSaberProvider } from "@saberhq/anchor-contrib";
import { chaiSolana, expectTX } from "@saberhq/chai-solana";
import type {
  Provider as SaberProvider,
  PublicKey,
} from "@saberhq/solana-contrib";
import { PendingTransaction } from "@saberhq/solana-contrib";
import {
  getATAAddress,
  getMintInfo,
  getTokenAccount,
  u64,
} from "@saberhq/token-utils";
import { Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { BN } from "bn.js";
import chai, { assert, expect } from "chai";

import type { AssetData, PrismTokenData } from "../src";
import {
  generatePrismAddress,
  generatePrismTokenAddress,
  SplitcoinPrismSDK,
} from "../src";
import { getToAmount } from "./utils";

chai.use(chaiSolana);

describe("splitcoin-prism", () => {
  // Provider setup
  const anchorProvider = Provider.env();
  setProvider(anchorProvider);

  const testSigner = Keypair.generate();

  const provider: SaberProvider = makeSaberProvider(anchorProvider);
  const sdk: SplitcoinPrismSDK = SplitcoinPrismSDK.loadWithSigner({
    provider,
    signer: testSigner,
  });

  // Helper variables
  let authority: PublicKey;
  let prism: PublicKey;

  // Unit tests
  it("Initialize test state", async () => {
    authority = testSigner.publicKey;

    await expectTX(
      new PendingTransaction(
        provider.connection,
        await provider.connection.requestAirdrop(authority, LAMPORTS_PER_SOL)
      )
    ).to.be.fulfilled;
  });

  it("Initialize prism program state", async () => {
    // Initialize prism
    const tx = await sdk.initialize({ owner: authority });

    await expectTX(tx, "Initialize prism program state with owner as invoker.")
      .to.be.fulfilled;

    // Verify prism data
    const [pdaKey, bump] = await generatePrismAddress();
    const prismData = await sdk.fetchPrismData(pdaKey);

    expect(prismData?.owner).to.eqAddress(authority);
    expect(prismData?.bump).to.equal(bump);

    prism = pdaKey;
  });

  it("Initializes a prism asset", async () => {
    // Defines
    const mintKP = Keypair.generate();
    const mint = mintKP.publicKey;

    const initialSupply = new u64(100);

    const assets: AssetData[] = [
      {
        dataFeed: { constant: { price: new BN(9), expo: 9 } },
        weight: new BN(4),
      },
      {
        dataFeed: { constant: { price: new BN(9), expo: 9 } },
        weight: new BN(1),
      },
      {
        dataFeed: { constant: { price: new BN(9), expo: 9 } },
        weight: new BN(2),
      },
    ];

    // Register token with 3 assets
    const tx = await sdk.registerToken({
      prism,
      mintKP,
      assets,
      authority,
      authorityKp: testSigner,
      initialSupply,
    });

    await expectTX(tx, "Initialize asset with assetToken").to.be.fulfilled;

    // Verify token data
    const [tokenKey, bump] = await generatePrismTokenAddress(mint);
    const tokenData = (await sdk.fetchPrismTokenData(
      tokenKey
    )) as PrismTokenData;

    expect(tokenData.prism).to.eqAddress(prism);
    expect(tokenData.authority).to.eqAddress(authority);
    expect(tokenData.bump).to.equal(bump);
    expect(tokenData.mint).to.eqAddress(mint);
    // TODO: Add custom deep compare for assets

    // Verify mint authority is properly set to prism
    const mintAuthorityA = (await getMintInfo(provider, mint))
      .mintAuthority as PublicKey;

    expect(mintAuthorityA).to.eqAddress(prism);

    // Verify ATA was created
    const ataAddress = await getATAAddress({ mint, owner: prism });

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
  });

  it("Convert between prisms", async () => {
    // Defines
    const mintAkp = Keypair.generate();
    const mintBkp = Keypair.generate();

    const mintA = mintAkp.publicKey;
    const mintB = mintBkp.publicKey;

    const priceA = new BN(9);
    const weightA = new BN(4);

    const priceB = new BN(11);
    const weightB = new BN(2);

    const initialSupply = new u64(9);
    const conversionAmount = new BN(1);

    const assetDataA: AssetData[] = [
      {
        dataFeed: { constant: { price: priceA, expo: 9 } },
        weight: weightA,
      },
    ];

    const assetDataB: AssetData[] = [
      {
        dataFeed: { constant: { price: priceB, expo: 9 } },
        weight: weightB,
      },
    ];

    // Register token A
    const txA = await sdk.registerToken({
      prism,
      mintKP: mintAkp,
      assets: assetDataA,
      authority,
      authorityKp: testSigner,
      initialSupply,
    });

    await expectTX(txA, "Register token A").to.be.fulfilled;

    // Register token B
    const txB = await sdk.registerToken({
      prism,
      mintKP: mintBkp,
      assets: assetDataB,
      authority,
      authorityKp: testSigner,
    });

    await expectTX(txB, "Register token B").to.be.fulfilled;

    // Convert from A to B
    const [tokenKeyA] = await generatePrismTokenAddress(mintA);
    const [tokenKeyB] = await generatePrismTokenAddress(mintB);

    const convertTx = await sdk.convert({
      prism,
      fromPrism: tokenKeyA,
      toPrism: tokenKeyB,
      amount: conversionAmount,
    });

    await expectTX(
      convertTx,
      `Convert ${conversionAmount.toString()} of token A to token B`
    ).to.be.fulfilled;

    // Verify token A supply
    const tokenA = await getATAAddress({ mint: mintA, owner: prism });
    const tokenAAccount = await getTokenAccount(provider, tokenA);

    assert(
      tokenAAccount.amount.eq(initialSupply.sub(conversionAmount)),
      "Incorrect token A supply"
    );

    // Verify token B supply
    const tokenB = await getATAAddress({ mint: mintB, owner: prism });
    const tokenBAccount = await getTokenAccount(provider, tokenB);

    expect(tokenBAccount.amount.toNumber()).to.equal(
      getToAmount(assetDataA, assetDataB, conversionAmount.toNumber())
    );
  });
});
