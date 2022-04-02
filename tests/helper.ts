/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import "chai-bn";

import { Provider, setProvider } from "@project-serum/anchor";
import { makeSaberProvider } from "@saberhq/anchor-contrib";
import { chaiSolana, expectTX } from "@saberhq/chai-solana";
import type {
  Provider as SaberProvider,
  PublicKey,
} from "@saberhq/solana-contrib";
import { PendingTransaction } from "@saberhq/solana-contrib";
import { Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import chai, { expect } from "chai";
import { before } from "mocha";

import { CoherenceBeamsplitterSDK, generateBeamsplitterAddress } from "../src";

chai.use(chaiSolana);

export interface CoherenceHelper {
  anchorProvider: Provider;
  testSigner: Keypair;
  provider: SaberProvider;
  sdk: CoherenceBeamsplitterSDK;
  authority: PublicKey;
  beamsplitter: PublicKey;
}

export let coherenceHelper: CoherenceHelper;

before("Initialize coherence helper", () => {
  // Provider setup
  const anchorProvider = Provider.env();
  setProvider(anchorProvider);

  const testSigner = Keypair.generate();

  const provider = makeSaberProvider(anchorProvider);
  const sdk = CoherenceBeamsplitterSDK.loadWithSigner({
    provider: provider,
    signer: testSigner,
  });

  // Helper variables
  let authority: PublicKey;

  // Unit tests
  it("Initialize test state (fund accounts)", async () => {
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
    const tx = await sdk.initialize({
      owner: authority,
    });

    await expectTX(
      tx,
      "Initialize beamsplitter program state with owner as invoker."
    ).to.be.fulfilled;

    // Verify beamsplitter data
    const [pdaKey, bump] = await generateBeamsplitterAddress();
    const beamsplitterData = await sdk.fetchBeamsplitterData(pdaKey);

    expect(beamsplitterData?.owner).to.eqAddress(authority);
    expect(beamsplitterData?.bump).to.equal(bump);

    coherenceHelper = {
      anchorProvider,
      testSigner,
      provider,
      sdk,
      authority,
      beamsplitter: pdaKey,
    };
  });
});
