use crate::state::*;

use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    mint,
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
#[instruction(bump: u8)]
pub struct RegisterToken<'info> {
    /// Information about the [PrismEtf].
    #[account(
        init,
        seeds = [
            b"PrismEtf".as_ref(),
            token_mint.key().to_bytes().as_ref()
        ],
        bump,
        payer = admin_authority,
    )]
    pub prism_etf: Box<Account<'info, PrismEtf>>,
    /// Authority that has admin rights over the [PrismEtf].
    pub admin_authority: Signer<'info>,
    /// The central mint authority for all registered tokens, used for checks
    #[account(
        seeds = [
            b"Beamsplitter".as_ref(),
        ],
        bump = beamsplitter.bump,
    )]
    pub beamsplitter: Account<'info, Beamsplitter>,
    /// [Mint] of the [PrismEtf].
    pub token_mint: Account<'info, Mint>,
    /// The [System] program.
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Buy<'info> {
    pub usdc_token_authority: SystemAccount<'info>,

    #[account(mut)]
    pub prism_etf_mint: Account<'info, Mint>,

    /// The Prism ETF [Account] that describes the assets being purchased
    #[account(owner = crate::ID)]
    pub prism_etf: Account<'info, PrismEtf>,

    /// The [Signer] of the tx and owner of the [Deposit] [Account]
    pub buyer: Signer<'info>,

    /// The account paying usdc for Basket tokens
    #[account(mut, associated_token::mint = mint::USDC, associated_token::authority = usdc_token_authority)]
    pub buyer_token: Account<'info, TokenAccount>,

    /// The [TokenAccount] that recieves the Basket Tokens
    #[account(mut, associated_token::mint = prism_etf_mint, associated_token::authority = beamsplitter)]
    pub reciever_token: Account<'info, TokenAccount>,

    /// The [Beamsplitter] [Account] that holds all of the Program's funds
    #[account(
        seeds = [
            b"Beamsplitter".as_ref(),
        ],
        bump = beamsplitter.bump,
        owner = crate::ID,
    )]
    pub beamsplitter: Account<'info, Beamsplitter>,

    #[account(mut, associated_token::mint = mint::USDC, associated_token::authority = usdc_token_authority)]
    pub beamsplitter_token: Account<'info, TokenAccount>,

    pub associated_token_program: Program<'info, AssociatedToken>,

    pub token_program: Program<'info, Token>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct GetPrice<'info> {
    #[account(init, payer = payer)]
    pub price: Account<'info, PriceConfig>,
    /// Authority that has admin rights over the [PrismToken].
    pub payer: Signer<'info>,
    /// The [System] program.
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Sell<'info> {
    /// Authority that has admin rights over the [PrismEtf].
    pub seller: Signer<'info>,

    // Account that holds seller's tokens
    #[account(mut, associated_token::mint = mint::USDC, associated_token::authority = seller)]
    pub seller_token: Account<'info, TokenAccount>,

    /// The central mint authority for all registered tokens, used for checks
    #[account(
        seeds = [
            b"Beamsplitter".as_ref(),
        ],
        bump = beamsplitter.bump,
    )]
    pub beamsplitter: Account<'info, Beamsplitter>,

    /// [Mint] of the [PrismEtf].
    pub token_mint: Account<'info, Mint>,

    // PrismEtf Account
    #[account(owner = crate::ID)]
    pub prism_etf: Account<'info, PrismEtf>,

    /// Needed to interact with the associated token program
    pub associated_token_program: Program<'info, AssociatedToken>,

    /// Needed to interact with the token program
    pub token_program: Program<'info, Token>,

    /// Needed to interact with the system program
    pub system_program: Program<'info, System>,
}
