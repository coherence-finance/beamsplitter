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

import { CoherenceSDK, generateBeamsplitterAddress } from "../src";
import exploitTests from "./exploit-tests";
import stressTests from "./stress-tests";
import unitTests from "./unit-tests";

chai.use(chaiSolana);

export interface CoherenceHelper {
  anchorProvider: Provider;
  testSigner: Keypair;
  provider: SaberProvider;
  sdk: CoherenceSDK;
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
  let sdk: CoherenceSDK;

  // Helper variables
  let authority: PublicKey;

  it("Initialize sdk", async () => {
    sdk = await CoherenceSDK.initWithSigner({
      provider: provider,
      signer: testSigner,
    });
  });

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
    const tx = sdk.beamsplitter.initialize({
      owner: authority,
    });

    await expectTX(
      tx,
      "Initialize beamsplitter program state with owner as invoker."
    ).to.be.fulfilled;

    await sdk.refreshBeamsplitter();

    // Verify beamsplitter data
    const [pdaKey, bump] = await generateBeamsplitterAddress();

    expect(sdk.beamsplitter.beamsplitterData?.owner).to.eqAddress(authority);
    expect(sdk.beamsplitter.beamsplitterData?.bump).to.equal(bump);

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

describe("coherence-beamsplitter", () => {
  stressTests();
  exploitTests();
  unitTests();
});
