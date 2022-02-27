# Beamsplitter

Beamsplitter is Coherence's cryptocurrency ETF program on [Solana](https://solana.com/). This monorepo contains the on-chain program as well as the client sdk for interacting with Beamsplitter. It uses, [Anchor](https://project-serum.github.io/anchor/), a framework that simplifies development on Solana. You can use the program to buy, sell, request transfer of listed etf tokens. The sdk allows the same functionality

## Installing the SDK (Off-Chain)

If you are building a client that interacts with Beamsplitter, install the sdk through:

```sh
yarn add @coherence-finance/sdk
```

[Looking for examples? Check out the ](/src/EXAMPLES.md)

## Calling the Program (On-Chain)

If you are writing a Solana program that makes CPI of Beamsplitter then follow the steps below

## Building and Deploying the Program

If you are building from source or deploying your own instance of Beamsplitter, use the steps below.

First install [Anchor](https://project-serum.github.io/anchor/getting-started/installation.html) and it's dependencies.

Next, install the necessary test client dependencies with:

```bash
yarn
```

Next, compile the program and generate the IDL for the tests with Anchor's [build](https://project-serum.github.io/anchor/cli/commands.html#build) command:

```bash
anchor build
```

Next, install submodules

```bash
git submodule init
git submodule update
```

Next, build the DEX submodule

```bash
cd deps/serum-dex/dex/ && cargo build-bpf && cd ../../../
```

Deploy the program with Anchor's [deploy](https://project-serum.github.io/anchor/cli/commands.html#deploy) command:

```bash
anchor deploy
```

Beamsplitter is live 🎉.

## Testing

Anchor, and therefore Beamsplitter, uses [ts-Mocha](https://github.com/piotrwitek/ts-mocha) a Typescript wrapper around [Mocha](https://mochajs.org/).

Integration tests can be added under the tests directory. Execute the tests with:

```bash
yarn test
```
