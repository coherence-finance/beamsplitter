const anchor = require("@project-serum/anchor");
const BN = anchor.BN;
const { OpenOrders } = require("@project-serum/serum");
const { approve } = require("@project-serum/serum/lib/token-instructions");
const {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  Token,
  TOKEN_PROGRAM_ID,
} = require("@solana/spl-token");
const serumCmn = require("@project-serum/common");
const utils = require("./setup-market");
const {
  Keypair,
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
} = require("@solana/web3.js");
const chai = require("chai");
const { assert, expect } = chai;
const { chaiSolana, expectTX } = require("@saberhq/chai-solana");
const {
  PendingTransaction,
  PublicKey,
  TransactionEnvelope,
} = require("@saberhq/solana-contrib");
const {
  CoherenceBeamsplitterSDK,
  generateBeamsplitterAddress,
  generatePrismEtfAddress,
} = require("../src");
const {
  createATAInstruction,
  createInitMintInstructions,
  createMintToInstruction,
  getATAAddress,
  getMintInfo,
  getTokenAccount,
  u64,
} = require("@saberhq/token-utils");

chai.use(chaiSolana);

// Taker fee rate (bps).
const TAKER_FEE = 0.0022;

function programPaidBy(program, payer) {
  const newProvider = new anchor.Provider(
    program.provider.connection,
    new anchor.Wallet(payer),
    {}
  );

  return new anchor.Program(program.idl, program.programId, newProvider);
}

describe("swap", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.Provider.env());

  const testSigner = Keypair.generate();

  const program = programPaidBy(
    anchor.workspace.CoherenceBeamsplitter,
    testSigner
  );
  const provider = program.provider;

  // Accounts used to setup the orderbook.
  let ORDERBOOK_ENV,
    // Accounts used for A -> USDC swap transactions.
    SWAP_A_USDC_ACCOUNTS,
    // Accounts used for  USDC -> A swap transactions.
    SWAP_USDC_A_ACCOUNTS,
    // Serum DEX vault PDA for market A/USDC.
    marketAVaultSigner,
    // Serum DEX vault PDA for market B/USDC.
    marketBVaultSigner;

  // Open orders accounts on the two markets for the provider.
  const openOrdersA = anchor.web3.Keypair.generate();
  const openOrdersB = anchor.web3.Keypair.generate();
  const prismEtfKP = Keypair.generate();
  let prismEtfMint;

  let authority = testSigner.publicKey;

  it("Initialize test state", async () => {
    await expectTX(
      new PendingTransaction(
        provider.connection,
        await provider.connection.requestAirdrop(
          authority,
          LAMPORTS_PER_SOL * 1000000
        )
      )
    ).to.be.fulfilled;
  });

  it("Initialize beamsplitter program state", async () => {
    // Initialize prism
    const [prismEtfKey, bump] = await generateBeamsplitterAddress();
    await program.rpc.initialize(bump, {
      accounts: {
        beamsplitter: prismEtfKey,
        owner: authority,
        systemProgram: SystemProgram.programId,
      },
    });

    // Verify beamsplitter data
    const beamsplitterData = await program.account.beamsplitter.fetchNullable(
      prismEtfKey
    );

    expect(beamsplitterData?.owner).to.eqAddress(authority);
    expect(beamsplitterData?.bump).to.equal(bump);
  });

  it("BOILERPLATE: Sets up two markets with resting orders", async () => {
    ORDERBOOK_ENV = await utils.setupTwoMarkets({
      provider,
    });
  });

  it("Initializes a prism etf", async () => {
    const [beamsplitter, bump] = await generateBeamsplitterAddress();

    const initialSupply = new u64(100);

    const weightedTokens = [
      {
        mint: ORDERBOOK_ENV.mintA,
        weight: 4,
      },
    ];

    const mintToken = await Token.createMint(
      provider.connection,
      testSigner,
      authority,
      authority,
      9,
      TOKEN_PROGRAM_ID
    );
    const mint = mintToken.publicKey;

    const toAta = await getATAAddress({
      mint,
      owner: beamsplitter,
    });
    const ataInstruction = createATAInstruction({
      mint,
      address: toAta,
      owner: beamsplitter,
      payer: provider.wallet.publicKey,
    });

    await program.rpc.registerToken(bump, weightedTokens, {
      accounts: {
        beamsplitter,
        prismEtf: prismEtfKP.publicKey,
        adminAuthority: authority,
        tokenMint: mint,
        systemProgram: SystemProgram.programId,
      },
      instructions: [
        await program.account.prismEtf.createInstruction(
          prismEtfKP,
          589928 + 8 // use size_of on PrismEtf to get this value (8 is reserved for disscriminator)
        ),
        // First order to this market so one must create the open orders account.
        await OpenOrders.makeCreateAccountTransaction(
          program.provider.connection,
          ORDERBOOK_ENV.marketA._decoded.ownAddress,
          program.provider.wallet.publicKey,
          openOrdersA.publicKey,
          utils.DEX_PID
        ),
        // Might as well create the second open orders account while we're here.
        // In prod, this should actually be done within the same tx as an
        // order to market B.
        await OpenOrders.makeCreateAccountTransaction(
          program.provider.connection,
          ORDERBOOK_ENV.marketB._decoded.ownAddress,
          program.provider.wallet.publicKey,
          openOrdersB.publicKey,
          utils.DEX_PID
        ),
      ],
      signers: [openOrdersA, openOrdersB, prismEtfKP],
    });

    await provider.send(
      (() => {
        const tx = new Transaction();
        tx.add(...(ataInstruction ? [ataInstruction] : []));
        return tx;
      })()
    );

    if (initialSupply && testSigner) {
      await provider.send(
        (() => {
          const tx = new Transaction();
          tx.add(
            Token.createMintToInstruction(
              TOKEN_PROGRAM_ID,
              mint,
              toAta,
              testSigner.publicKey,
              [],
              initialSupply
            )
          );
          return tx;
        })()
      );
    }

    await provider.send(
      (() => {
        const tx = new Transaction();
        tx.add(
          Token.createSetAuthorityInstruction(
            TOKEN_PROGRAM_ID,
            mint,
            beamsplitter,
            "MintTokens",
            authority,
            []
          )
        );
        return tx;
      })()
    );

    // Verify token data
    //const [tokenKey, bump] = await generatePrismEtfAddress(mint);
    const tokenData = await program.account.prismEtf.fetchNullable(
      prismEtfKP.publicKey
    );

    expect(tokenData.prismEtf).to.eqAddress(beamsplitter);
    expect(tokenData.authority).to.eqAddress(authority);
    //expect(tokenData.bump).to.equal(bump);
    expect(tokenData.mint).to.eqAddress(mint);

    // Need to set prism etf mint for next test
    prismEtfMint = tokenData.mint;

    // TODO: Add custom deep compare for assets

    // Verify ATA was created
    const ataAddress = await getATAAddress({ mint, owner: beamsplitter });

    assert(
      (await provider.connection.getAccountInfo(
        ataAddress,
        provider.opts.commitment
      )) !== null,
      "Ata address does not exist"
    );
  });

  it("BOILERPLATE: Sets up reusable accounts", async () => {
    const marketA = ORDERBOOK_ENV.marketA;
    const marketB = ORDERBOOK_ENV.marketB;

    const [vaultSignerA] = await utils.getVaultOwnerAndNonce(
      marketA._decoded.ownAddress
    );
    const [vaultSignerB] = await utils.getVaultOwnerAndNonce(
      marketB._decoded.ownAddress
    );
    marketAVaultSigner = vaultSignerA;
    marketBVaultSigner = vaultSignerB;

    SWAP_USDC_A_ACCOUNTS = [
      {
        pubkey: marketA._decoded.ownAddress,
        isWritable: true,
        isSigner: false,
      },
      {
        pubkey: openOrdersA.publicKey,
        isWritable: true,
        isSigner: false,
      },
      {
        pubkey: marketA._decoded.requestQueue,
        isWritable: true,
        isSigner: false,
      },
      {
        pubkey: marketA._decoded.eventQueue,
        isWritable: true,
        isSigner: false,
      },
      {
        pubkey: marketA._decoded.bids,
        isWritable: true,
        isSigner: false,
      },
      {
        pubkey: marketA._decoded.asks,
        isWritable: true,
        isSigner: false,
      },
      {
        pubkey: ORDERBOOK_ENV.godUsdc,
        isWritable: true,
        isSigner: false,
      },
      {
        pubkey: marketA._decoded.baseVault,
        isWritable: true,
        isSigner: false,
      },
      {
        pubkey: marketA._decoded.quoteVault,
        isWritable: true,
        isSigner: false,
      },
      {
        pubkey: marketAVaultSigner,
        isWritable: true,
        isSigner: false,
      },
      {
        pubkey: ORDERBOOK_ENV.godA,
        isWritable: true,
        isSigner: false,
      },
    ];
    SWAP_A_USDC_ACCOUNTS = {
      ...SWAP_USDC_A_ACCOUNTS,
      market: {
        ...SWAP_USDC_A_ACCOUNTS.market,
        orderPayerTokenAccount: ORDERBOOK_ENV.godA,
      },
    };
  });

  it("Buy ETF Token", async () => {
    const [beamsplitter] = await generateBeamsplitterAddress();

    const marketA = ORDERBOOK_ENV.marketA;
    const usdc = ORDERBOOK_ENV.usdc;
    const usdcAuthority = provider.wallet.publicKey;

    const toToken = await getATAAddress({
      mint: prismEtfMint,
      owner: beamsplitter,
    });

    // user's token account used for payment
    const fromToken = await getATAAddress({
      mint: usdc,
      owner: usdcAuthority,
    });
    const fromTokenAtaInstruction = createATAInstruction({
      mint: usdc,
      address: fromToken,
      owner: usdcAuthority,
      payer: provider.wallet.publicKey,
    });

    await provider.send(
      (() => {
        const tx = new Transaction();
        tx.add(...(fromTokenAtaInstruction ? [fromTokenAtaInstruction] : []));
        tx.add(
          Token.createMintToInstruction(
            TOKEN_PROGRAM_ID,
            usdc,
            fromToken,
            usdcAuthority,
            [],
            100
          )
        );
        return tx;
      })(),
      [testSigner]
    );

    // Approve transfer of [amount] tokens out of user token account
    await provider.send(
      (() => {
        const tx = new Transaction();
        tx.add(
          approve({
            owner: provider.wallet.publicKey,
            delegate: beamsplitter,
            source: fromToken,
            amount: 100,
          })
        );
        return tx;
      })()
    );

    // Swap exactly enough USDC to get 1.2 A tokens (best offer price is 6.041 USDC).
    const expectedResultantAmount = 7.2;
    const bestOfferPrice = 6.041;
    const amountToSpend = expectedResultantAmount * bestOfferPrice;
    const swapAmount = new BN((amountToSpend / (1 - TAKER_FEE)) * 10 ** 6);

    console.log(
      "usdc before " +
        (await serumCmn.getTokenAccount(provider, fromToken)).amount.toString()
    );
    console.log(
      "etf before " +
        (await serumCmn.getTokenAccount(provider, toToken)).amount.toString()
    );

    const [tokenAChange, usdcChange] = await withBalanceChange(
      program.provider,
      [ORDERBOOK_ENV.godA, ORDERBOOK_ENV.godUsdc],
      async () => {
        await program.rpc.buy({
          accounts: {
            usdcMint: usdc,
            usdcTokenAuthority: usdcAuthority,
            prismEtfMint,
            prismEtf: prismEtfKP.publicKey,
            buyer: provider.wallet.publicKey,
            buyerToken: fromToken,
            recieverToken: toToken,
            beamsplitter,
            beamsplitterToken: ORDERBOOK_ENV.godUsdc,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
            dexProgram: utils.DEX_PID,
            systemProgram: SystemProgram.programId,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            tokenProgram: TOKEN_PROGRAM_ID,
          },
          remainingAccounts: SWAP_USDC_A_ACCOUNTS,
        });
      }
    );

    console.log(
      "usdc after " +
        (await serumCmn.getTokenAccount(provider, fromToken)).amount.toString()
    );
    console.log(
      "etf after " +
        (await serumCmn.getTokenAccount(provider, toToken)).amount.toString()
    );

    assert.ok(tokenAChange === expectedResultantAmount);
    assert.ok(usdcChange > -swapAmount.toNumber() / 10 ** 6);
  });

  // it("Swaps from Token A to USDC", async () => {
  //   const marketA = ORDERBOOK_ENV.marketA;

  //   // Swap out A tokens for USDC.
  //   const swapAmount = 8.1;
  //   const bestBidPrice = 6.004;
  //   const amountToFill = swapAmount * bestBidPrice;
  //   const resultantAmount = new BN(amountToFill * TAKER_FEE * 10 ** 6);

  //   const [tokenAChange, usdcChange] = await withBalanceChange(
  //     program.provider,
  //     [ORDERBOOK_ENV.godA, ORDERBOOK_ENV.godUsdc],
  //     async () => {
  //       await program.rpc.swap(
  //         Side.Ask,
  //         new BN(swapAmount * 10 ** 6),
  //         new BN(swapAmount),
  //         {
  //           accounts: SWAP_A_USDC_ACCOUNTS,
  //         }
  //       );
  //     }
  //   );

  //   assert.ok(tokenAChange === -swapAmount);
  //   assert.ok(usdcChange > resultantAmount.toNumber() / 10 ** 6);
  // });
});

// Side rust enum used for the program's RPC API.
const Side = {
  Bid: { bid: {} },
  Ask: { ask: {} },
};

// Executes a closure. Returning the change in balances from before and after
// its execution.
async function withBalanceChange(provider, addrs, fn) {
  const beforeBalances = [];
  for (let k = 0; k < addrs.length; k += 1) {
    beforeBalances.push(
      (await serumCmn.getTokenAccount(provider, addrs[k])).amount
    );
  }

  await fn();

  const afterBalances = [];
  for (let k = 0; k < addrs.length; k += 1) {
    afterBalances.push(
      (await serumCmn.getTokenAccount(provider, addrs[k])).amount
    );
  }

  const deltas = [];
  for (let k = 0; k < addrs.length; k += 1) {
    deltas.push(
      (afterBalances[k].toNumber() - beforeBalances[k].toNumber()) / 10 ** 6
    );
  }
  return deltas;
}
