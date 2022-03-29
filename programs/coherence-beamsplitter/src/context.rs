use crate::state::*;

use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};

const BEAMSPLITTER_SIZE: usize = std::mem::size_of::<Beamsplitter>();
const PRISM_ETF_SIZE: usize = std::mem::size_of::<PrismEtf>();
const ORDER_STATE_SIZE: usize = std::mem::size_of::<OrderState>();

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
        space = BEAMSPLITTER_SIZE + 8,
    )]
    pub beamsplitter: Account<'info, Beamsplitter>,
    /// The owner of the Beamsplitter program
    #[account(mut)]
    pub owner: Signer<'info>,

    // ========================= Programs =========================
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
    pub weighted_tokens: AccountLoader<'info, WeightedTokens>,

    /// [Mint] of the [PrismEtf].
    pub prism_etf_mint: Account<'info, Mint>,

    #[account(mut)]
    pub manager: Signer<'info>,

    // ========================= PDA's =========================
    /// Information about the [PrismEtf].
    #[account(init, seeds = [b"PrismEtf".as_ref(), &prism_etf_mint.key().to_bytes(), &beamsplitter.key().to_bytes()], bump, payer = manager, space = PRISM_ETF_SIZE + 1 + 8)]
    pub prism_etf: Account<'info, PrismEtf>,

    /// The central mint authority for all registered tokens, used for checks
    #[account(
        seeds = [
            b"Beamsplitter".as_ref(),
        ],
        bump = beamsplitter.bump,
    )]
    pub beamsplitter: Account<'info, Beamsplitter>,

    // ========================= Programs =========================
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FinalizePrismEtf<'info> {
    /// [Mint] of the [PrismEtf].
    pub prism_etf_mint: Account<'info, Mint>,

    pub manager: Signer<'info>,

    // ========================= PDA's =========================
    /// Information about the [PrismEtf].
    #[account(seeds = [b"PrismEtf".as_ref(), &prism_etf_mint.key().to_bytes(), &beamsplitter.key().to_bytes()], bump = prism_etf.bump, has_one = manager, mut)]
    pub prism_etf: Account<'info, PrismEtf>,

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
    #[account(mut)]
    pub weighted_tokens: AccountLoader<'info, WeightedTokens>,

    /// [Mint] of the [PrismEtf].
    pub prism_etf_mint: Account<'info, Mint>,

    pub manager: Signer<'info>,

    // ========================= PDA's =========================
    /// Information about the [PrismEtf].
    #[account(seeds = [b"PrismEtf".as_ref(), &prism_etf_mint.key().to_bytes(), &beamsplitter.key().to_bytes()], bump = prism_etf.bump, has_one = weighted_tokens, has_one = manager)]
    pub prism_etf: Account<'info, PrismEtf>,

    /// The central mint authority for all registered tokens, used for checks
    #[account(
        seeds = [
            b"Beamsplitter".as_ref(),
        ],
        bump = beamsplitter.bump,
    )]
    pub beamsplitter: Account<'info, Beamsplitter>,

    // ========================= Programs =========================
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct InitOrderState<'info> {
    pub prism_etf_mint: Account<'info, Mint>,

    pub transferred_tokens: AccountLoader<'info, TransferredTokens>,

    /// The [Signer] of the tx and owner of the [Deposit] [Account]
    #[account(mut)]
    pub orderer: Signer<'info>,

    // ========================= PDA's =========================
    /// The [Beamsplitter] [Account] that holds all of the Program's funds
    #[account(
        seeds = [
            b"Beamsplitter".as_ref(),
        ],
        bump = beamsplitter.bump,
    )]
    pub beamsplitter: Box<Account<'info, Beamsplitter>>,

    #[account(init, seeds = [b"OrderState".as_ref(), &prism_etf_mint.key().to_bytes(), &orderer.key().to_bytes(), &beamsplitter.key().to_bytes()], bump, payer = orderer, space = ORDER_STATE_SIZE + 4 + 8)]
    pub order_state: Account<'info, OrderState>,

    // ========================= Programs =========================
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct StartOrder<'info> {
    #[account(mut)]
    pub prism_etf_mint: Account<'info, Mint>,

    /// The [Signer] of the tx and owner of the [Deposit] [Account]\
    pub orderer: Signer<'info>,

    // ========================= ATA's =========================
    /// The [TokenAccount] that receives the Basket Tokens
    #[account(mut, associated_token::mint = prism_etf_mint, associated_token::authority = orderer)]
    pub orderer_etf_ata: Box<Account<'info, TokenAccount>>,

    // ========================= PDA's =========================
    /// The Prism ETF [Account] that this instruction uses
    #[account(seeds = [b"PrismEtf".as_ref(), &prism_etf_mint.key().to_bytes(), &beamsplitter.key().to_bytes()], bump = prism_etf.bump, has_one = weighted_tokens)]
    pub prism_etf: Box<Account<'info, PrismEtf>>,

    #[account(mut, seeds = [b"OrderState".as_ref(), &prism_etf_mint.key().to_bytes(), &orderer.key().to_bytes(), &beamsplitter.key().to_bytes()], bump = order_state.bump, has_one = transferred_tokens)]
    pub order_state: Box<Account<'info, OrderState>>,

    #[account(
        seeds = [
            b"Beamsplitter".as_ref(),
        ],
        bump = beamsplitter.bump,
    )]
    pub beamsplitter: Box<Account<'info, Beamsplitter>>,

    // ========================= Big Data Accounts =========================
    pub weighted_tokens: AccountLoader<'info, WeightedTokens>,

    #[account(mut)]
    pub transferred_tokens: AccountLoader<'info, TransferredTokens>,

    // ========================= Programs =========================
    pub rent: Sysvar<'info, Rent>,

    pub associated_token_program: Program<'info, AssociatedToken>,

    pub token_program: Program<'info, Token>,
    /// The [System] program.
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Cohere<'info> {
    /// The [Signer] of the tx and owner of the [Deposit] [Account]
    pub orderer: Signer<'info>,

    // ========================= Mint's =========================
    pub prism_etf_mint: Account<'info, Mint>,

    /// The mint of the asset being transferred
    pub transfer_mint: Account<'info, Mint>,

    // ========================= ATA's =========================
    /// The [TokenAccount] that transfers out tokens
    #[account(associated_token::mint = transfer_mint, associated_token::authority = orderer, mut)]
    pub orderer_transfer_ata: Box<Account<'info, TokenAccount>>,

    /// The [TokenAccount] that transfers in tokens
    #[account(associated_token::mint = transfer_mint, associated_token::authority = prism_etf, mut)]
    pub beamsplitter_transfer_ata: Box<Account<'info, TokenAccount>>,

    // ========================= PDA's =========================
    /// The [Beamsplitter] [Account] that holds all of the Program's funds
    #[account(
        seeds = [
            b"Beamsplitter".as_ref(),
        ],
        bump = beamsplitter.bump,
    )]
    pub beamsplitter: Box<Account<'info, Beamsplitter>>,

    /// The Prism ETF [Account] that this instruction uses
    #[account(seeds = [b"PrismEtf".as_ref(), &prism_etf_mint.key().to_bytes(), &beamsplitter.key().to_bytes()], bump = prism_etf.bump, has_one = weighted_tokens)]
    pub prism_etf: Box<Account<'info, PrismEtf>>,

    #[account(seeds = [b"OrderState".as_ref(), &prism_etf_mint.key().to_bytes(), &orderer.key().to_bytes(), &beamsplitter.key().to_bytes()], bump = order_state.bump, has_one = transferred_tokens)]
    pub order_state: Box<Account<'info, OrderState>>,

    // ========================= Big Data Accounts =========================
    pub weighted_tokens: AccountLoader<'info, WeightedTokens>,

    #[account(mut)]
    pub transferred_tokens: AccountLoader<'info, TransferredTokens>,

    // ========================= Programs =========================
    pub rent: Sysvar<'info, Rent>,

    pub associated_token_program: Program<'info, AssociatedToken>,

    pub token_program: Program<'info, Token>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Decohere<'info> {
    /// The [Signer] of the tx and owner of the [Deposit] [Account]
    pub orderer: Signer<'info>,

    // ========================= Mint's =========================
    /// The mint of the asset being transferred
    pub transfer_mint: Account<'info, Mint>,

    pub prism_etf_mint: Account<'info, Mint>,

    // ========================= ATA's =========================
    /// The [TokenAccount] that transfers out tokens
    #[account(associated_token::mint = transfer_mint, associated_token::authority = orderer, mut)]
    pub orderer_transfer_ata: Box<Account<'info, TokenAccount>>,

    /// The [TokenAccount] that transfers in tokens
    #[account(associated_token::mint = transfer_mint, associated_token::authority = prism_etf, mut)]
    pub beamsplitter_transfer_ata: Box<Account<'info, TokenAccount>>,

    // ========================= PDA's =========================
    /// The Prism ETF [Account] that this instruction uses
    #[account(seeds = [b"PrismEtf".as_ref(), &prism_etf_mint.key().to_bytes(), &beamsplitter.key().to_bytes()], bump = prism_etf.bump)]
    pub prism_etf: Box<Account<'info, PrismEtf>>,

    #[account(seeds = [b"OrderState".as_ref(), &prism_etf_mint.key().to_bytes(), &orderer.key().to_bytes(), &beamsplitter.key().to_bytes()], bump = order_state.bump, has_one = transferred_tokens)]
    pub order_state: Box<Account<'info, OrderState>>,

    /// The [Beamsplitter] [Account] that holds all of the Program's funds
    #[account(
        seeds = [
            b"Beamsplitter".as_ref(),
        ],
        bump = beamsplitter.bump,
    )]
    pub beamsplitter: Box<Account<'info, Beamsplitter>>,

    // ========================= Big Data Accounts =========================
    pub weighted_tokens: AccountLoader<'info, WeightedTokens>,

    #[account(mut)]
    pub transferred_tokens: AccountLoader<'info, TransferredTokens>,

    // ========================= Programs =========================
    pub rent: Sysvar<'info, Rent>,

    pub associated_token_program: Program<'info, AssociatedToken>,

    pub token_program: Program<'info, Token>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FinalizeOrder<'info> {
    #[account(mut)]
    pub prism_etf_mint: Account<'info, Mint>,

    /// The [Signer] of the tx and owner of the [Deposit] [Account]
    pub orderer: Signer<'info>,

    pub manager: AccountInfo<'info>,

    pub owner: AccountInfo<'info>,

    // ========================= ATA's =========================
    /// The [TokenAccount] that recieves the Basket Tokens
    #[account(associated_token::mint = prism_etf_mint, associated_token::authority = orderer, mut)]
    pub orderer_etf_ata: Box<Account<'info, TokenAccount>>,

    #[account(associated_token::mint = prism_etf_mint, associated_token::authority = manager, mut)]
    pub manager_etf_ata: Box<Account<'info, TokenAccount>>,

    #[account(associated_token::mint = prism_etf_mint, associated_token::authority = owner, mut)]
    pub owner_etf_ata: Box<Account<'info, TokenAccount>>,

    // ========================= PDA's =========================
    /// The Prism ETF [Account] that this instruction uses
    #[account(seeds = [b"PrismEtf".as_ref(), &prism_etf_mint.key().to_bytes(), &beamsplitter.key().to_bytes()], bump = prism_etf.bump, has_one = manager)]
    pub prism_etf: Box<Account<'info, PrismEtf>>,

    #[account(seeds = [b"OrderState".as_ref(), &prism_etf_mint.key().to_bytes(), &orderer.key().to_bytes(), &beamsplitter.key().to_bytes()], bump = order_state.bump, has_one = transferred_tokens, mut)]
    pub order_state: Box<Account<'info, OrderState>>,

    /// The [Beamsplitter] [Account] that holds all of the Program's funds
    #[account(
        seeds = [
            b"Beamsplitter".as_ref(),
        ],
        bump = beamsplitter.bump,
        has_one = owner,
    )]
    pub beamsplitter: Box<Account<'info, Beamsplitter>>,

    // ========================= Big Data Accounts =========================
    pub weighted_tokens: AccountLoader<'info, WeightedTokens>,

    pub transferred_tokens: AccountLoader<'info, TransferredTokens>,

    // ========================= Programs =========================
    pub rent: Sysvar<'info, Rent>,

    pub associated_token_program: Program<'info, AssociatedToken>,

    pub token_program: Program<'info, Token>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetOwner<'info> {
    pub new_owner: AccountInfo<'info>,

    pub owner: Signer<'info>,

    // ========================= PDA's =========================
    /// The [Beamsplitter] [Account] that holds all of the Program's funds
    #[account(
        seeds = [
            b"Beamsplitter".as_ref(),
        ],
        bump = beamsplitter.bump,
        has_one = owner,
        mut
    )]
    pub beamsplitter: Box<Account<'info, Beamsplitter>>,
}

#[derive(Accounts)]
pub struct SetDefaultManagerCut<'info> {
    pub owner: Signer<'info>,

    // ========================= PDA's =========================
    /// The [Beamsplitter] [Account] that holds all of the Program's funds
    #[account(
        seeds = [
            b"Beamsplitter".as_ref(),
        ],
        bump = beamsplitter.bump,
        has_one = owner,
        mut
    )]
    pub beamsplitter: Box<Account<'info, Beamsplitter>>,
}

#[derive(Accounts)]
pub struct SetDefaultConstruction<'info> {
    pub owner: Signer<'info>,

    // ========================= PDA's =========================
    /// The [Beamsplitter] [Account] that holds all of the Program's funds
    #[account(
        seeds = [
            b"Beamsplitter".as_ref(),
        ],
        bump = beamsplitter.bump,
        has_one = owner,
        mut
    )]
    pub beamsplitter: Box<Account<'info, Beamsplitter>>,
}

#[derive(Accounts)]
pub struct SetDefaultDeconstruction<'info> {
    pub owner: Signer<'info>,

    // ========================= PDA's =========================
    /// The [Beamsplitter] [Account] that holds all of the Program's funds
    #[account(
        seeds = [
            b"Beamsplitter".as_ref(),
        ],
        bump = beamsplitter.bump,
        has_one = owner,
        mut
    )]
    pub beamsplitter: Box<Account<'info, Beamsplitter>>,
}

#[derive(Accounts)]
pub struct SetManager<'info> {
    pub prism_etf_mint: Account<'info, Mint>,

    pub new_manager: AccountInfo<'info>,

    pub manager: Signer<'info>,

    // ========================= PDA's =========================
    /// The Prism ETF [Account] that this instruction uses
    #[account(seeds = [b"PrismEtf".as_ref(), &prism_etf_mint.key().to_bytes(), &beamsplitter.key().to_bytes()], bump = prism_etf.bump, has_one = manager, mut)]
    pub prism_etf: Box<Account<'info, PrismEtf>>,

    /// The [Beamsplitter] [Account] that holds all of the Program's funds
    #[account(
        seeds = [
            b"Beamsplitter".as_ref(),
        ],
        bump = beamsplitter.bump,
    )]
    pub beamsplitter: Box<Account<'info, Beamsplitter>>,
}

#[derive(Accounts)]
pub struct SetManagerCut<'info> {
    pub prism_etf_mint: Account<'info, Mint>,

    pub manager: Signer<'info>,

    // ========================= PDA's =========================
    /// The Prism ETF [Account] that this instruction uses
    #[account(seeds = [b"PrismEtf".as_ref(), &prism_etf_mint.key().to_bytes(), &beamsplitter.key().to_bytes()], bump = prism_etf.bump, has_one = manager, mut)]
    pub prism_etf: Box<Account<'info, PrismEtf>>,

    /// The [Beamsplitter] [Account] that holds all of the Program's funds
    #[account(
        seeds = [
            b"Beamsplitter".as_ref(),
        ],
        bump = beamsplitter.bump,
    )]
    pub beamsplitter: Box<Account<'info, Beamsplitter>>,
}

#[derive(Accounts)]
pub struct SetConstruction<'info> {
    pub prism_etf_mint: Account<'info, Mint>,

    pub owner: Signer<'info>,

    // ========================= PDA's =========================
    /// The Prism ETF [Account] that this instruction uses
    #[account(seeds = [b"PrismEtf".as_ref(), &prism_etf_mint.key().to_bytes(), &beamsplitter.key().to_bytes()], bump = prism_etf.bump, mut)]
    pub prism_etf: Box<Account<'info, PrismEtf>>,

    /// The [Beamsplitter] [Account] that holds all of the Program's funds
    #[account(
        seeds = [
            b"Beamsplitter".as_ref(),
        ],
        bump = beamsplitter.bump,
    )]
    pub beamsplitter: Box<Account<'info, Beamsplitter>>,
}

#[derive(Accounts)]
pub struct SetDeconstruction<'info> {
    pub prism_etf_mint: Account<'info, Mint>,

    pub owner: Signer<'info>,

    // ========================= PDA's =========================
    /// The Prism ETF [Account] that this instruction uses
    #[account(seeds = [b"PrismEtf".as_ref(), &prism_etf_mint.key().to_bytes(), &beamsplitter.key().to_bytes()], bump = prism_etf.bump, mut)]
    pub prism_etf: Box<Account<'info, PrismEtf>>,

    /// The [Beamsplitter] [Account] that holds all of the Program's funds
    #[account(
        seeds = [
            b"Beamsplitter".as_ref(),
        ],
        bump = beamsplitter.bump,
    )]
    pub beamsplitter: Box<Account<'info, Beamsplitter>>,
}

#[derive(Accounts)]
pub struct ClosePrismEtf<'info> {
    #[account(mut, close = manager)]
    pub weighted_tokens: AccountLoader<'info, WeightedTokens>,

    pub prism_etf_mint: Account<'info, Mint>,

    pub manager: Signer<'info>,

    // ========================= PDA's =========================
    /// The Prism ETF [Account] that this instruction uses
    #[account(seeds = [b"PrismEtf".as_ref(), &prism_etf_mint.key().to_bytes(), &beamsplitter.key().to_bytes()], bump = prism_etf.bump, mut, has_one = manager, close = manager)]
    pub prism_etf: Box<Account<'info, PrismEtf>>,

    /// The [Beamsplitter] [Account] that holds all of the Program's funds
    #[account(
        seeds = [
            b"Beamsplitter".as_ref(),
        ],
        bump = beamsplitter.bump,
    )]
    pub beamsplitter: Box<Account<'info, Beamsplitter>>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CloseOrderState<'info> {
    #[account(mut, close = orderer)]
    pub transferred_tokens: AccountLoader<'info, TransferredTokens>,

    pub prism_etf_mint: Account<'info, Mint>,

    /// The [Signer] of the tx and owner of the [Deposit] [Account]
    pub orderer: Signer<'info>,

    pub manager: AccountInfo<'info>,

    // ========================= PDA's =========================
    /// The Prism ETF [Account] that this instruction uses
    #[account(seeds = [b"PrismEtf".as_ref(), &prism_etf_mint.key().to_bytes(), &beamsplitter.key().to_bytes()], bump = prism_etf.bump, mut, has_one = manager)]
    pub prism_etf: Box<Account<'info, PrismEtf>>,

    #[account(seeds = [b"OrderState".as_ref(), &prism_etf_mint.key().to_bytes(), &orderer.key().to_bytes(), &beamsplitter.key().to_bytes()], bump = order_state.bump, has_one = transferred_tokens, mut, close = orderer)]
    pub order_state: Box<Account<'info, OrderState>>,

    /// The [Beamsplitter] [Account] that holds all of the Program's funds
    #[account(
        seeds = [
            b"Beamsplitter".as_ref(),
        ],
        bump = beamsplitter.bump,
    )]
    pub beamsplitter: Box<Account<'info, Beamsplitter>>,

    pub system_program: Program<'info, System>,
}
