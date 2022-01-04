import { Provider, setProvider } from "@project-serum/anchor";
import { makeSaberProvider } from "@saberhq/anchor-contrib";
import { chaiSolana, expectTX } from "@saberhq/chai-solana";
import type {
  Provider as SaberProvider,
  PublicKey,
} from "@saberhq/solana-contrib";
import {
  createTokenAccount,
  getATAAddress,
  getTokenAccount,
  Token,
  TokenAmount,
} from "@saberhq/token-utils";
import { Keypair } from "@solana/web3.js";
import chai, { expect } from "chai";

import { SplitcoinPrismSDK } from "../src";
import { generatePrismAddress } from "../src/pda";

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
  let prismToken: Token;
  let user1: PublicKey;
  let user2: PublicKey;

  // Unit tests
  it("Initialize test state", () => {
    authority = provider.wallet.publicKey;
    mintKP = Keypair.generate();
    prismToken = Token.fromMint(mintKP.publicKey, 12);
  });

  it("Initialize prism", async () => {
    const tx = await sdk.initialize({
      mintKP,
      decimals: prismToken.decimals,
      authority,
    });
    await expectTX(tx, "Initialize Prism").to.be.fulfilled;

    const [prismKey, bump] = await generatePrismAddress(mintKP.publicKey);

    const prismData = await sdk.fetchPrismData(prismKey);

    expect(prismData?.authority).to.eqAddress(authority);
    expect(prismData?.bump).to.equal(bump);
    expect(prismData?.mint).to.eqAddress(mintKP.publicKey);
  });

  it("Initialize token accounts", async () => {
    const { key: user1Key, tx: user1Tx } = await createTokenAccount({
      provider,
      mint: mintKP.publicKey,
      owner: authority,
    });
    await expectTX(user1Tx, "User1 token account created").to.be.fulfilled;
    user1 = user1Key;

    const { key: user2Key, tx: user2Tx } = await createTokenAccount({
      provider,
      mint: mintKP.publicKey,
      owner: authority,
    });
    await expectTX(user2Tx, "User2 token account created").to.be.fulfilled;
    user2 = user2Key;
  });

  it("Mint tokens to User1", async () => {
    const amount = new TokenAmount(prismToken, 1000);

    await expectTX(
      sdk.mint({
        amount,
        mint: mintKP.publicKey,
        to: user1,
      }),
      "Issue tokens to User1"
    ).to.be.fulfilled;

    const user1Account = await getTokenAccount(provider, user1);

    expect(user1Account.amount).to.bignumber.equal(amount.toU64());
  });

  it("Mint tokens to Prism Associated Token Account", async () => {
    const amount = new TokenAmount(prismToken, 1000);

    const [prismKey] = await generatePrismAddress(prismToken.mintAccount);
    const prismAta = await getATAAddress({
      mint: mintKP.publicKey,
      owner: prismKey,
    });

    await expectTX(
      sdk.mint({
        amount,
        mint: mintKP.publicKey,
        to: prismAta,
      }),
      "Issue tokens to Prism ATA"
    ).to.be.fulfilled;

    const prismAccount = await getTokenAccount(provider, prismAta);

    expect(prismAccount.amount).to.bignumber.equal(amount.toU64());
  });

  it("Transfer tokens from Prism ATA to User2", async () => {
    const [prismKey] = await generatePrismAddress(prismToken.mintAccount);
    const prismAta = await getATAAddress({
      mint: mintKP.publicKey,
      owner: prismKey,
    });
    const prismAccountStartingBalance = new TokenAmount(
      prismToken,
      (await getTokenAccount(provider, prismAta)).amount
    );

    const amount = new TokenAmount(prismToken, 400);
    await expectTX(
      sdk.transfer({
        amount,
        to: user2,
      }),
      "Transfer tokens from Prism account to User1"
    ).to.be.fulfilled;

    const prismAccount = await getTokenAccount(provider, prismAta);
    const user2Account = await getTokenAccount(provider, user2);

    expect(prismAccount.amount).to.bignumber.equal(
      prismAccountStartingBalance.subtract(amount).toU64()
    );
    expect(user2Account.amount).to.bignumber.equal(amount.toU64());
  });

  it("Burn tokens from Prism Associated Token Account", async () => {
    const [prismKey] = await generatePrismAddress(prismToken.mintAccount);
    const prismAta = await getATAAddress({
      mint: mintKP.publicKey,
      owner: prismKey,
    });
    const prismAccountStartingBalance = new TokenAmount(
      prismToken,
      (await getTokenAccount(provider, prismAta)).amount
    );

    const amount = new TokenAmount(prismToken, 300);
    await expectTX(
      sdk.burn({
        amount,
        mint: mintKP.publicKey,
        source: prismAta,
      }),
      "Burn tokens from Prism account"
    ).to.be.fulfilled;

    const prismAccount = await getTokenAccount(provider, prismAta);

    expect(prismAccount.amount).to.bignumber.equal(
      prismAccountStartingBalance.subtract(amount).toU64()
    );
  });
});
