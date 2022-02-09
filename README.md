# Beamsplitter

Beamsplitter is Coherence's asset conversion platform built on Solana. This repo is for the on-chain program, if you are looking for Beamsplitter's client you should go to [insert client repo here](https://www.youtube.com/watch?v=xuCO7-DLCaA)

## Installation

First install [Anchor](https://project-serum.github.io/anchor/getting-started/installation.html) and it's dependencies.

Next, to install the necessary test client dependencies, run:

```bash
yarn
```

Next, in order to get IDL information for the tests, run:

```bash
anchor build
```

## Building and Deploying

Build the program binary with Anchor's [build](https://project-serum.github.io/anchor/cli/commands.html#build) command:

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

Integration tests can be added under the tests directory. You can run tests with the `yarn test` command:

```bash
yarn test
```
