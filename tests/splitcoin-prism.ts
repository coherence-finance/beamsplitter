import { Provider, setProvider } from "@project-serum/anchor";
import { makeSaberProvider } from "@saberhq/anchor-contrib";
import { chaiSolana, expectTX } from "@saberhq/chai-solana";
import type {
  Provider as SaberProvider,
  PublicKey,
} from "@saberhq/solana-contrib";
import { Token } from "@saberhq/token-utils";
import { Keypair } from "@solana/web3.js";
import chai, { expect } from "chai";

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
  let assetToken: Token;

  // Unit tests
  it("Initialize test state", () => {
    authority = provider.wallet.publicKey;
    mintKP = Keypair.generate();
    assetToken = Token.fromMint(mintKP.publicKey, 12);
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
    const tx = await sdk.registerToken({
      mintKP,
      assets: [],
      authority,
    });
    await expectTX(tx, "Initialize asset with assetToken").to.be.fulfilled;

    const [tokenKey, bump] = await generatePrismTokenAddress(mintKP.publicKey);

    const assetData = await sdk.fetchAssetData(tokenKey);

    expect(assetData?.authority).to.eqAddress(authority);
    expect(assetData?.bump).to.equal(bump);
    expect(assetData?.mint).to.eqAddress(mintKP.publicKey);
  });
});
