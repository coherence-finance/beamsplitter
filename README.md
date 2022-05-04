![BeamSplitter Logo](https://github.com/coherence-finance/beamsplitter/blob/master/beamsplitter.png?raw=true)

[![npm version](https://badge.fury.io/js/@coherence-finance%2Fsdk.svg)](https://badge.fury.io/js/@coherence-finance%2Fsdk)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Discord Support](https://badgen.net/badge/icon/discord?icon=discord&label)](https://discord.gg/xs5NEHxAK8)

BeamSplitter is Coherence's cryptocurrency ETF program on [Solana](https://solana.com/). This monorepo contains the on-chain program as well as the client sdk for interacting with Beamsplitter. It uses, [Anchor](https://project-serum.github.io/anchor/), a framework that simplifies development on Solana. You can use the program to construct and deconstruct on-chain ETF-like tokens.

## Installing the SDK (Off-Chain)

If you are building a client that interacts with Beamsplitter, install the sdk through:

```sh
yarn add @coherence-finance/sdk
```

[Looking for examples? Check out the EXAMPLES.md file](/src/EXAMPLES.md)

## Calling the Program (On-Chain)

If you are writing a Solana program that makes CPI of Beamsplitter:
```rust
// Better docs coming soon 😛
```

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
