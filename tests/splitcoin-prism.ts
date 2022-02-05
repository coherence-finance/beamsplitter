import { Provider, setProvider } from "@project-serum/anchor";
import { makeSaberProvider } from "@saberhq/anchor-contrib";
import { chaiSolana, expectTX } from "@saberhq/chai-solana";
import type {
  Provider as SaberProvider,
  PublicKey,
} from "@saberhq/solana-contrib";
import { Keypair } from "@solana/web3.js";
import { BN } from "bn.js";
import chai, { expect } from "chai";

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

  const provider: SaberProvider = makeSaberProvider(anchorProvider);
  const sdk: SplitcoinPrismSDK = SplitcoinPrismSDK.load({
    provider,
  });

  // Helper variables
  let authority: PublicKey;
  let mintKP: Keypair;

  // Unit tests
  it("Initialize test state", () => {
    authority = provider.wallet.publicKey;
    mintKP = Keypair.generate();
  });

  it("Initialize prism program state", async () => {
    const tx = await sdk.initialize({ owner: provider.wallet.publicKey });
    await expectTX(tx, "Initialize prism program state with owner as invoker.")
      .to.be.fulfilled;

    const [assetKey, bump] = await generatePrismAddress();
    const prismData = await sdk.fetchPrismData(assetKey);

    expect(prismData?.owner).to.eqAddress(provider.wallet.publicKey);
    expect(prismData?.bump).to.equal(bump);
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
  });
});
