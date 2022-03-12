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

    #[account(mut)]
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

    #[account(init, seeds = [b"OrderState".as_ref(), &prism_etf_mint.key().to_bytes(), &orderer.key().to_bytes(), &beamsplitter.key().to_bytes()], bump = bump, payer = orderer)]
    pub order_state: Account<'info, OrderState>,

    pub transferred_tokens: AccountLoader<'info, TransferredTokens>,

    /// The [Signer] of the tx and owner of the [Deposit] [Account]
    pub orderer: Signer<'info>,

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
    #[account(mut)]
    pub prism_etf_mint: Account<'info, Mint>,

    /// The Prism ETF [Account] that describes the assets being purchased
    #[account(seeds = [b"PrismEtf".as_ref(), &prism_etf_mint.key().to_bytes(), &beamsplitter.key().to_bytes()], bump = prism_etf.bump, has_one = weighted_tokens)]
    pub prism_etf: Box<Account<'info, PrismEtf>>,

    #[account(mut, seeds = [b"OrderState".as_ref(), &prism_etf_mint.key().to_bytes(), &orderer.key().to_bytes(), &beamsplitter.key().to_bytes()], bump = order_state.bump, has_one = transferred_tokens)]
    pub order_state: Box<Account<'info, OrderState>>,

    pub weighted_tokens: AccountLoader<'info, WeightedTokens>,

    #[account(mut)]
    pub transferred_tokens: AccountLoader<'info, TransferredTokens>,

    /// The [Signer] of the tx and owner of the [Deposit] [Account]\
    pub orderer: Signer<'info>,

    /// The [TokenAccount] that recieves the Basket Tokens
    #[account(mut, associated_token::mint = prism_etf_mint, associated_token::authority = orderer)]
    pub orderer_etf_ata: Box<Account<'info, TokenAccount>>,

    /// The [Beamsplitter] [Account] that holds all of the Program's funds
    pub rent: Sysvar<'info, Rent>,

    #[account(
        seeds = [
            b"Beamsplitter".as_ref(),
        ],
        bump = beamsplitter.bump,
    )]
    pub beamsplitter: Box<Account<'info, Beamsplitter>>,

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

    #[account(seeds = [b"OrderState".as_ref(), &prism_etf_mint.key().to_bytes(), &orderer.key().to_bytes(), &beamsplitter.key().to_bytes()], bump =  order_state.bump, has_one = transferred_tokens)]
    pub order_state: Box<Account<'info, OrderState>>,

    pub weighted_tokens: AccountLoader<'info, WeightedTokens>,

    #[account(mut)]
    pub transferred_tokens: AccountLoader<'info, TransferredTokens>,

    /// The [Signer] of the tx and owner of the [Deposit] [Account]
    pub orderer: Signer<'info>,

    /// The authority on the transfer mint
    pub transfer_authority: SystemAccount<'info>,

    /// The mint of the asset being transfered
    pub transfer_mint: Account<'info, Mint>,

    /// The [TokenAccount] that transfers out tokens
    #[account(associated_token::mint = transfer_mint, associated_token::authority = orderer)]
    pub orderer_transfer_ata: Box<Account<'info, TokenAccount>>,

    /// The [TokenAccount] that transfers in tokens
    #[account(init_if_needed, associated_token::mint = transfer_mint, associated_token::authority = beamsplitter, payer = orderer)]
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

    #[account(seeds = [b"OrderState".as_ref(), &prism_etf_mint.key().to_bytes(), &orderer.key().to_bytes(), &beamsplitter.key().to_bytes()], bump = order_state.bump, has_one = transferred_tokens)]
    pub order_state: Box<Account<'info, OrderState>>,

    pub weighted_tokens: AccountLoader<'info, WeightedTokens>,

    #[account(mut)]
    pub transferred_tokens: AccountLoader<'info, TransferredTokens>,

    /// The [Signer] of the tx and owner of the [Deposit] [Account]
    pub orderer: Signer<'info>,

    /// The authority on the transfer mint
    pub transfer_authority: SystemAccount<'info>,

    /// The mint of the asset being transfered
    pub transfer_mint: Account<'info, Mint>,

    /// The [TokenAccount] that transfers out tokens
    #[account(init_if_needed, associated_token::mint = transfer_mint, associated_token::authority = orderer, payer = orderer)]
    pub orderer_transfer_ata: Box<Account<'info, TokenAccount>>,

    /// The [TokenAccount] that transfers in tokens
    #[account(associated_token::mint = transfer_mint, associated_token::authority = beamsplitter)]
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
    #[account(mut)]
    pub prism_etf_mint: Account<'info, Mint>,

    /// The Prism ETF [Account] that describes the assets being purchased
    #[account(seeds = [b"PrismEtf".as_ref(), &prism_etf_mint.key().to_bytes(), &beamsplitter.key().to_bytes()], bump = prism_etf.bump)]
    pub prism_etf: Box<Account<'info, PrismEtf>>,

    #[account(seeds = [b"OrderState".as_ref(), &prism_etf_mint.key().to_bytes(), &orderer.key().to_bytes(), &beamsplitter.key().to_bytes()], bump = order_state.bump, has_one = transferred_tokens, mut)]
    pub order_state: Box<Account<'info, OrderState>>,

    pub weighted_tokens: AccountLoader<'info, WeightedTokens>,

    #[account(mut)]
    pub transferred_tokens: AccountLoader<'info, TransferredTokens>,

    /// The [Signer] of the tx and owner of the [Deposit] [Account]
    pub orderer: Signer<'info>,

    /// The [TokenAccount] that recieves the Basket Tokens
    #[account(associated_token::mint = prism_etf_mint, associated_token::authority = orderer, mut)]
    pub orderer_etf_ata: Box<Account<'info, TokenAccount>>,

    /// The [Beamsplitter] [Account] that holds all of the Program's funds
    #[account(
        seeds = [
            b"Beamsplitter".as_ref(),
        ],
        bump = beamsplitter.bump,
    )]
    pub beamsplitter: Box<Account<'info, Beamsplitter>>,

    pub rent: Sysvar<'info, Rent>,
    ///
    pub associated_token_program: Program<'info, AssociatedToken>,

    pub token_program: Program<'info, Token>,
    /// The [System] program.
    pub system_program: Program<'info, System>,
}
