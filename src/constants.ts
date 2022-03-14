import { PublicKey } from "@solana/web3.js";

export const PROGRAM_ID = new PublicKey(
  "8DqYYy74EJ6rEhX9aWjuTcfBi37mVviR65thPEqVqkrS"
);

//export const USDC_MINT_DEVNET = new PublicKey("");
export const USDC_MINT_MAINNET = new PublicKey(
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
);

// TODO add check if on LOCAL NET, DEVNET, MAINNET etc
export const getUSDCMint = (): PublicKey => USDC_MINT_MAINNET;
