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
        bump = bump,
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
        bump = bump,
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
pub struct Convert<'info> {
    /// The [Prism] authority account
    #[account(
        seeds = [
            b"Beamsplitter".as_ref(),
        ],
        bump = beamsplitter.bump,
    )]
    pub beamsplitter: Account<'info, Beamsplitter>,

    #[account(
        seeds = [
            b"PrismEtf".as_ref(),
            from_mint.key().to_bytes().as_ref()
        ],
        bump = from_token.bump
    )]
    /// The [PrismEtf] [Account] used for calculating the incoming tokens to burn
    pub from_token: Box<Account<'info, PrismEtf>>,

    /// The [Mint] of the burned tokens
    #[account(mut)]
    pub from_mint: Account<'info, Mint>,

    /// The paying [TokenAccount]
    #[account(mut, associated_token::mint = from_mint, associated_token::authority = beamsplitter)]
    pub from: Account<'info, TokenAccount>,

    #[account(
        seeds = [
            b"PrismEtf".as_ref(),
            to_mint.key().to_bytes().as_ref()
        ],
        bump = to_token.bump
    )]
    /// The [PrismEtf] [Account] used for calculating the outgoing tokens to mint
    pub to_token: Box<Account<'info, PrismEtf>>,

    /// The [Mint] of the minted tokens
    #[account(mut)]
    pub to_mint: Account<'info, Mint>,

    /// The receiving [Account]
    #[account(mut, associated_token::mint = to_mint, associated_token::authority = beamsplitter)]
    pub to: Account<'info, TokenAccount>,

    /// The [Token] [Program].
    pub token_program: Program<'info, Token>,

    /// The [AssociatedToken] [Program]
    pub associated_program: Program<'info, AssociatedToken>,
}
