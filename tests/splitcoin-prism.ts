import { Provider, setProvider } from "@project-serum/anchor";
import { makeSaberProvider } from "@saberhq/anchor-contrib";
import { chaiSolana, expectTX } from "@saberhq/chai-solana";
import type {
  Provider as SaberProvider,
  PublicKey,
} from "@saberhq/solana-contrib";
import {
  PendingTransaction,
  TransactionEnvelope,
} from "@saberhq/solana-contrib";
import {
  createMintToInstruction,
  getATAAddress,
  getMintInfo,
  getTokenAccount,
  u64,
} from "@saberhq/token-utils";
import { Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { BN } from "bn.js";
import chai, { assert, expect } from "chai";

import type { AssetData } from "../src";
import {
  generatePrismAddress,
  generatePrismTokenAddress,
  SplitcoinPrismSDK,
} from "../src";

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
  let mintKP: Keypair;
  let prism: PublicKey;

  // Unit tests
  it("Initialize test state", async () => {
    authority = testSigner.publicKey;
    mintKP = Keypair.generate();
    await expectTX(
      new PendingTransaction(
        provider.connection,
        await provider.connection.requestAirdrop(authority, LAMPORTS_PER_SOL)
      )
    ).to.be.fulfilled;
  });

  it("Initialize prism program state", async () => {
    const tx = await sdk.initialize({ owner: authority });
    await expectTX(tx, "Initialize prism program state with owner as invoker.")
      .to.be.fulfilled;

    const [pdaKey, bump] = await generatePrismAddress();
    const prismData = await sdk.fetchPrismData(pdaKey);

    expect(prismData?.owner).to.eqAddress(authority);
    expect(prismData?.bump).to.equal(bump);

    prism = pdaKey;
  });

  it("Initializes a prism asset", async () => {
    const assetData: AssetData[] = [
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

    const tx = await sdk.registerToken({
      prism,
      mintKP,
      assets: assetData,
      authority,
    });
    await expectTX(tx, "Initialize asset with assetToken").to.be.fulfilled;

    const [tokenKey, bump] = await generatePrismTokenAddress(mintKP.publicKey);

    const tokenData = await sdk.fetchPrismTokenData(tokenKey);

    expect(tokenData?.authority).to.eqAddress(authority);
    expect(tokenData?.bump).to.equal(bump);
    expect(tokenData?.mint).to.eqAddress(mintKP.publicKey);

    await expect(getATAAddress({ mint: mintKP.publicKey, owner: authority })).to
      .be.fulfilled;
  });

  it("Convert between prisms", async () => {
    const mintA = Keypair.generate();
    const mintB = Keypair.generate();

    const priceA = new BN(9);
    const weightA = new BN(4);

    const assetDataA: AssetData[] = [
      {
        dataFeed: { constant: { price: priceA, expo: 9 } },
        weight: weightA,
      },
    ];

    const priceB = new BN(11);
    const weightB = new BN(2);

    const assetDataB: AssetData[] = [
      {
        dataFeed: { constant: { price: priceB, expo: 9 } },
        weight: weightB,
      },
    ];

    const txA = await sdk.registerToken({
      prism,
      mintKP: mintA,
      assets: assetDataA,
      authority: authority,
      mintAuthority: authority,
    });
    await expectTX(txA, "Initialize asset with assetToken").to.be.fulfilled;

    const txB = await sdk.registerToken({
      prism,
      mintKP: mintB,
      assets: assetDataB,
      authority: authority,
    });
    await expectTX(txB, "Initialize asset with assetToken").to.be.fulfilled;

    const [tokenKeyA, bumpA] = await generatePrismTokenAddress(mintA.publicKey);

    const tokenDataA = await sdk.fetchPrismTokenData(tokenKeyA);

    expect(tokenDataA?.authority).to.eqAddress(authority);
    expect(tokenDataA?.bump).to.equal(bumpA);
    expect(tokenDataA?.mint).to.eqAddress(mintA.publicKey);

    await expect(getATAAddress({ mint: mintA.publicKey, owner: authority })).to
      .be.fulfilled;

    const [tokenKeyB, bumpB] = await generatePrismTokenAddress(mintB.publicKey);

    const tokenDataB = await sdk.fetchPrismTokenData(tokenKeyB);

    expect(tokenDataB?.authority).to.eqAddress(authority);
    expect(tokenDataB?.bump).to.equal(bumpB);
    expect(tokenDataB?.mint).to.eqAddress(mintB.publicKey);

    await expect(getATAAddress({ mint: mintB.publicKey, owner: authority })).to
      .be.fulfilled;

    const initSupply = new u64(9);

    const createSupplyTx = createMintToInstruction({
      provider,
      mint: mintA.publicKey,
      mintAuthorityKP: testSigner,
      to: await getATAAddress({ mint: mintA.publicKey, owner: authority }),
      amount: initSupply,
    });

    await expectTX(createSupplyTx, `Mint ${initSupply.toString()} to authority`)
      .to.be.fulfilled;

    const tokenAAccount = await getTokenAccount(
      provider,
      await getATAAddress({ mint: mintA.publicKey, owner: authority })
    );

    assert(tokenAAccount.amount.eq(new BN(9)));

    console.log("mintAuth0 " + authority.toString());

    const setAuthTx = new TransactionEnvelope(
      provider,
      [
        Token.createSetAuthorityInstruction(
          TOKEN_PROGRAM_ID,
          mintA.publicKey,
          prism,
          "MintTokens",
          authority,
          []
        ),
      ],
      [testSigner]
    );

    await expectTX(setAuthTx, `Set Prism as auth of tokenA`).to.be.fulfilled;

    const mintAuthorityA = (await getMintInfo(provider, mintA.publicKey))
      .mintAuthority;

    assert(mintAuthorityA?.equals(prism));
    // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
    console.log("mintAuth " + mintAuthorityA?.toString());
    console.log("prism " + prism.toString());

    const convertTx = await sdk.convert({
      prism,
      fromPrism: tokenKeyA,
      toPrism: tokenKeyB,
      amount: new BN(1),
    });

    await expectTX(
      convertTx,
      `Convert ${initSupply.toString()} of token A to token B`
    ).to.be.fulfilled;
  });
});
