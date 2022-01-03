import { newProgram } from "@saberhq/anchor-contrib";
import {
    AugmentedProvider,
    Provider,
    TransactionEnvelope,
} from "@saberhq/solana-contrib";
import { SolanaAugmentedProvider } from "@saberhq/solana-contrib";
import {
    createInitMintInstructions,
    getATAAddress,
    getOrCreateATA,
    TokenAmount,
    TOKEN_PROGRAM_ID,
} from "@saberhq/token-utils";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { SplitcoinPrismData } from ".";
import { PROGRAM_ID } from "./constants";
import { IDL } from "../target/types/splitcoin_prism";
import { generatePrismAddress } from "./pda";
import type { SplitcoinPrismProgram } from "./types";

export class SplitcoinPrismSDK {
    constructor(
        readonly provider: AugmentedProvider,
        readonly program: SplitcoinPrismProgram
    ) {}

    static load({ provider }: { provider: Provider }): SplitcoinPrismSDK {
        const aug = new SolanaAugmentedProvider(provider);
        return new SplitcoinPrismSDK(
            aug,
            newProgram<SplitcoinPrismProgram>(IDL, PROGRAM_ID, aug)
        );
    }

    async initialize({
        mintKP,
        decimals,
        authority = this.provider.wallet.publicKey,
    }: {
        mintKP: Keypair;
        decimals?: number;
        authority: PublicKey;
    }): Promise<TransactionEnvelope> {
        const [prismKey, bump] = await generatePrismAddress(mintKP.publicKey);

        const initMintTX = await createInitMintInstructions({
            provider: this.provider,
            mintKP,
            decimals,
            mintAuthority: prismKey,
            freezeAuthority: prismKey,
        });
        const initPrismAndCreateAtaTx = new TransactionEnvelope(this.provider, [
            this.program.instruction.initialize(bump, {
                accounts: {
                    prism: prismKey,
                    adminAuthority: authority,
                    prismMint: mintKP.publicKey,
                    systemProgram: SystemProgram.programId,
                },
            }),
            (
                await getOrCreateATA({
                    provider: this.provider,
                    mint: mintKP.publicKey,
                    owner: prismKey,
                })
            ).instruction,
        ]);

        return initMintTX.combine(initPrismAndCreateAtaTx);
    }

    async fetchPrismData(key: PublicKey): Promise<SplitcoinPrismData | null> {
        return (await this.program.account.splitcoinPrism.fetchNullable(
            key
        )) as SplitcoinPrismData;
    }

    async mint({
        amount,
        mint,
        to,
    }: {
        amount: TokenAmount;
        mint: PublicKey;
        to: PublicKey;
    }): Promise<TransactionEnvelope> {
        const [prismKey] = await generatePrismAddress(amount.token.mintAccount);
        return new TransactionEnvelope(this.provider, [
            this.program.instruction.proxyMintTo(amount.toU64(), {
                accounts: {
                    prism: prismKey,
                    prismMint: mint,
                    mintDestination: to,
                    tokenProgram: TOKEN_PROGRAM_ID,
                },
            }),
        ]);
    }

    async transfer({
        amount,
        from,
        to,
    }: {
        amount: TokenAmount;
        from?: PublicKey;
        to: PublicKey;
    }): Promise<TransactionEnvelope> {
        const mint = amount.token.mintAccount;
        const [prismKey] = await generatePrismAddress(mint);
        const prismAta = await getATAAddress({ mint, owner: prismKey });

        return new TransactionEnvelope(this.provider, [
            this.program.instruction.proxyTransfer(amount.toU64(), {
                accounts: {
                    prism: prismKey,
                    transferSource: from || prismAta,
                    transferDestination: to,
                    tokenProgram: TOKEN_PROGRAM_ID,
                },
            }),
        ]);
    }

    async burn({
        amount,
        mint,
        source,
    }: {
        amount: TokenAmount;
        mint: PublicKey;
        source: PublicKey;
    }): Promise<TransactionEnvelope> {
        const [prismKey] = await generatePrismAddress(mint);

        return new TransactionEnvelope(this.provider, [
            this.program.instruction.proxyBurn(amount.toU64(), {
                accounts: {
                    prism: prismKey,
                    prismMint: mint,
                    prismSource: source,
                    tokenProgram: TOKEN_PROGRAM_ID,
                },
            }),
        ]);
    }
}
