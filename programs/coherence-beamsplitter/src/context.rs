use crate::state::*;

use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};

#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct Initialize<'info> {
    /// The central mint authority for all registered tokens
    #[account(
        init,
        seeds = [
            b"Beamsplitter".as_ref(),
        ],
        bump,
        payer = owner,
    )]
    pub beamsplitter: Account<'info, Beamsplitter>,
    /// The owner of the Beamsplitter program
    pub owner: Signer<'info>,
    /// The [System] program.
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitWeightedTokens<'info> {
    #[account(zero)]
    pub weighted_tokens: AccountLoader<'info, WeightedTokens>,
}

#[derive(Accounts)]
pub struct InitTransferredTokens<'info> {
    #[account(zero)]
    pub transferred_tokens: AccountLoader<'info, TransferredTokens>,
}

#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct InitPrismEtf<'info> {
    /// Information about the [PrismEtf].
    #[account(init, seeds = [b"PrismEtf".as_ref(), &prism_etf_mint.key().to_bytes(), &beamsplitter.key().to_bytes()], bump = bump, payer = manager)]
    pub prism_etf: Account<'info, PrismEtf>,

    #[account(owner = crate::ID)]
    pub weighted_tokens: AccountLoader<'info, WeightedTokens>,

    /// [Mint] of the [PrismEtf].
    pub prism_etf_mint: Account<'info, Mint>,

    pub manager: Signer<'info>,
    /// The central mint authority for all registered tokens, used for checks
    #[account(
        seeds = [
            b"Beamsplitter".as_ref(),
        ],
        bump = beamsplitter.bump,
    )]
    pub beamsplitter: Account<'info, Beamsplitter>,
    /// The [System] program.
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FinalizePrismEtf<'info> {
    /// Information about the [PrismEtf].
    #[account(seeds = [b"PrismEtf".as_ref(), &prism_etf_mint.key().to_bytes(), &beamsplitter.key().to_bytes()], bump = prism_etf.bump, mut)]
    pub prism_etf: Account<'info, PrismEtf>,

    /// [Mint] of the [PrismEtf].
    pub prism_etf_mint: Account<'info, Mint>,

    /// The central mint authority for all registered tokens, used for checks
    #[account(
        seeds = [
            b"Beamsplitter".as_ref(),
        ],
        bump = beamsplitter.bump,
    )]
    pub beamsplitter: Account<'info, Beamsplitter>,
}

#[derive(Accounts)]
pub struct PushTokens<'info> {
    /// Information about the [PrismEtf].
    #[account(seeds = [b"PrismEtf".as_ref(), &prism_etf_mint.key().to_bytes(), &beamsplitter.key().to_bytes()], bump = prism_etf.bump, has_one = weighted_tokens)]
    pub prism_etf: Account<'info, PrismEtf>,

    #[account(owner = crate::ID, mut)]
    pub weighted_tokens: AccountLoader<'info, WeightedTokens>,

    /// [Mint] of the [PrismEtf].
    pub prism_etf_mint: Account<'info, Mint>,

    pub manager: Signer<'info>,
    /// The central mint authority for all registered tokens, used for checks
    #[account(
        seeds = [
            b"Beamsplitter".as_ref(),
        ],
        bump = beamsplitter.bump,
    )]
    pub beamsplitter: Account<'info, Beamsplitter>,
    /// The [System] program.
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct InitOrderState<'info> {
    pub prism_etf_mint: Account<'info, Mint>,

    /// The Prism ETF [Account] that describes the assets being purchased
    #[account(seeds = [b"PrismEtf".as_ref(), &prism_etf_mint.key().to_bytes(), &beamsplitter.key().to_bytes()], bump = prism_etf.bump)]
    pub prism_etf: Account<'info, PrismEtf>,

    #[account(init, seeds = [b"OrderState".as_ref(), &prism_etf_mint.key().to_bytes(), &orderer.key().to_bytes(), &beamsplitter.key().to_bytes()], bump = bump, payer = orderer)]
    pub order_state: Account<'info, OrderState>,

    #[account(owner = crate::ID)]
    pub transferred_tokens: AccountLoader<'info, TransferredTokens>,

    /// The [Signer] of the tx and owner of the [Deposit] [Account]
    pub orderer: Signer<'info>,

    /// The [TokenAccount] that recieves the Basket Tokens
    #[account(mut, associated_token::mint = prism_etf_mint, associated_token::authority = beamsplitter)]
    pub orderer_etf_ata: Box<Account<'info, TokenAccount>>,

    /// The [Beamsplitter] [Account] that holds all of the Program's funds
    #[account(
        seeds = [
            b"Beamsplitter".as_ref(),
        ],
        bump = beamsplitter.bump,
        owner = crate::ID,
    )]
    pub beamsplitter: Box<Account<'info, Beamsplitter>>,
    /// The [System] program.
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct StartOrder<'info> {
    pub prism_etf_mint: Account<'info, Mint>,

    /// The Prism ETF [Account] that describes the assets being purchased
    #[account(seeds = [b"PrismEtf".as_ref(), &prism_etf_mint.key().to_bytes(), &beamsplitter.key().to_bytes()], bump = prism_etf.bump, has_one = weighted_tokens)]
    pub prism_etf: Box<Account<'info, PrismEtf>>,

    #[account(seeds = [b"OrderState".as_ref(), &prism_etf_mint.key().to_bytes(), &orderer.key().to_bytes(), &beamsplitter.key().to_bytes()], bump = prism_etf.bump)]
    pub order_state: Box<Account<'info, OrderState>>,

    #[account(owner = crate::ID)]
    pub weighted_tokens: AccountLoader<'info, WeightedTokens>,

    #[account(owner = crate::ID, mut)]
    pub transferred_tokens: AccountLoader<'info, TransferredTokens>,

    /// The [Signer] of the tx and owner of the [Deposit] [Account]
    pub orderer: Signer<'info>,

    /// The [TokenAccount] that recieves the Basket Tokens
    #[account(init_if_needed, associated_token::mint = prism_etf_mint, associated_token::authority = beamsplitter, payer = orderer)]
    pub orderer_etf_ata: Box<Account<'info, TokenAccount>>,

    /// The [Beamsplitter] [Account] that holds all of the Program's funds
    #[account(
        seeds = [
            b"Beamsplitter".as_ref(),
        ],
        bump = beamsplitter.bump,
    )]
    pub rent: Sysvar<'info, Rent>,
    pub beamsplitter: Box<Account<'info, Beamsplitter>>,
    ///
    pub associated_token_program: Program<'info, AssociatedToken>,

    pub token_program: Program<'info, Token>,
    /// The [System] program.
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Cohere<'info> {
    pub prism_etf_mint: Account<'info, Mint>,

    /// The Prism ETF [Account] that describes the assets being purchased
    #[account(seeds = [b"PrismEtf".as_ref(), &prism_etf_mint.key().to_bytes(), &beamsplitter.key().to_bytes()], bump = prism_etf.bump, has_one = weighted_tokens)]
    pub prism_etf: Box<Account<'info, PrismEtf>>,

    #[account(seeds = [b"OrderState".as_ref(), &prism_etf_mint.key().to_bytes(), &orderer.key().to_bytes(), &beamsplitter.key().to_bytes()], bump = prism_etf.bump)]
    pub order_state: Box<Account<'info, OrderState>>,

    #[account(owner = crate::ID)]
    pub weighted_tokens: AccountLoader<'info, WeightedTokens>,

    #[account(owner = crate::ID, mut)]
    pub transferred_tokens: AccountLoader<'info, TransferredTokens>,

    /// The [Signer] of the tx and owner of the [Deposit] [Account]
    pub orderer: Signer<'info>,

    /// The authority on the transfer mint
    pub transfer_authority: SystemAccount<'info>,

    /// The mint of the asset being transfered
    pub transfer_mint: Account<'info, Mint>,

    /// The [TokenAccount] that transfers out tokens
    #[account(associated_token::mint = transfer_mint, associated_token::authority = transfer_authority)]
    pub orderer_transfer_ata: Box<Account<'info, TokenAccount>>,

    /// The [TokenAccount] that transfers in tokens
    #[account(init_if_needed, associated_token::mint = transfer_mint, associated_token::authority = transfer_authority, payer = orderer)]
    pub beamsplitter_transfer_ata: Box<Account<'info, TokenAccount>>,

    /// The [Beamsplitter] [Account] that holds all of the Program's funds
    #[account(
        seeds = [
            b"Beamsplitter".as_ref(),
        ],
        bump = beamsplitter.bump,
    )]
    pub beamsplitter: Box<Account<'info, Beamsplitter>>,

    pub rent: Sysvar<'info, Rent>,

    pub associated_token_program: Program<'info, AssociatedToken>,

    pub token_program: Program<'info, Token>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Decohere<'info> {
    pub prism_etf_mint: Account<'info, Mint>,

    /// The Prism ETF [Account] that describes the assets being purchased
    #[account(seeds = [b"PrismEtf".as_ref(), &prism_etf_mint.key().to_bytes(), &beamsplitter.key().to_bytes()], bump = prism_etf.bump)]
    pub prism_etf: Box<Account<'info, PrismEtf>>,

    #[account(seeds = [b"OrderState".as_ref(), &prism_etf_mint.key().to_bytes(), &orderer.key().to_bytes(), &beamsplitter.key().to_bytes()], bump = prism_etf.bump)]
    pub order_state: Box<Account<'info, OrderState>>,

    #[account(owner = crate::ID)]
    pub weighted_tokens: AccountLoader<'info, WeightedTokens>,

    #[account(owner = crate::ID, mut)]
    pub transferred_tokens: AccountLoader<'info, TransferredTokens>,

    /// The [Signer] of the tx and owner of the [Deposit] [Account]
    pub orderer: Signer<'info>,

    /// The authority on the transfer mint
    pub transfer_authority: SystemAccount<'info>,

    /// The mint of the asset being transfered
    pub transfer_mint: Account<'info, Mint>,

    /// The [TokenAccount] that transfers out tokens
    #[account(init_if_needed, associated_token::mint = transfer_mint, associated_token::authority = transfer_authority, payer = orderer)]
    pub orderer_transfer_ata: Box<Account<'info, TokenAccount>>,

    /// The [TokenAccount] that transfers in tokens
    #[account(associated_token::mint = transfer_mint, associated_token::authority = transfer_authority)]
    pub beamsplitter_transfer_ata: Box<Account<'info, TokenAccount>>,

    /// The [Beamsplitter] [Account] that holds all of the Program's funds
    #[account(
        seeds = [
            b"Beamsplitter".as_ref(),
        ],
        bump = beamsplitter.bump,
    )]
    pub beamsplitter: Box<Account<'info, Beamsplitter>>,

    pub rent: Sysvar<'info, Rent>,

    pub associated_token_program: Program<'info, AssociatedToken>,

    pub token_program: Program<'info, Token>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FinalizeOrder<'info> {
    pub prism_etf_mint: Account<'info, Mint>,

    /// The Prism ETF [Account] that describes the assets being purchased
    #[account(seeds = [b"PrismEtf".as_ref(), &prism_etf_mint.key().to_bytes(), &beamsplitter.key().to_bytes()], bump = prism_etf.bump)]
    pub prism_etf: Box<Account<'info, PrismEtf>>,

    #[account(seeds = [b"OrderState".as_ref(), &prism_etf_mint.key().to_bytes(), &orderer.key().to_bytes(), &beamsplitter.key().to_bytes()], bump = prism_etf.bump)]
    pub order_state: Box<Account<'info, OrderState>>,

    #[account(owner = crate::ID)]
    pub weighted_tokens: AccountLoader<'info, WeightedTokens>,

    #[account(owner = crate::ID, mut)]
    pub transferred_tokens: AccountLoader<'info, TransferredTokens>,

    /// The [Signer] of the tx and owner of the [Deposit] [Account]
    pub orderer: Signer<'info>,

    /// The [TokenAccount] that recieves the Basket Tokens
    #[account(init_if_needed, associated_token::mint = prism_etf_mint, associated_token::authority = beamsplitter, payer = orderer)]
    pub orderer_etf_ata: Box<Account<'info, TokenAccount>>,

    /// The [Beamsplitter] [Account] that holds all of the Program's funds
    #[account(
        seeds = [
            b"Beamsplitter".as_ref(),
        ],
        bump = beamsplitter.bump,
    )]
    pub rent: Sysvar<'info, Rent>,
    pub beamsplitter: Box<Account<'info, Beamsplitter>>,
    ///
    pub associated_token_program: Program<'info, AssociatedToken>,

    pub token_program: Program<'info, Token>,
    /// The [System] program.
    pub system_program: Program<'info, System>,
}
