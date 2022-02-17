import { PublicKey } from "@solana/web3.js";

export const PROGRAM_ID = new PublicKey(
  "4WWKCwKfhz7cVkd4sANskBk3y2aG9XpZ3fGSQcW1yTBB"
);

//export const USDC_MINT_DEVNET = new PublicKey("");
export const USDC_MINT_MAINNET = new PublicKey(
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
);

// TODO add check if on LOCAL NET, DEVNET, MAINNET etc
export const getUSDCMint = (): PublicKey => USDC_MINT_MAINNET;
