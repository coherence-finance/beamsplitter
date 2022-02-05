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
            b"Prism".as_ref(),
        ],
        bump = bump,
        payer = owner,
    )]
    pub prism: Account<'info, Prism>,
    /// The owner of the Prism program
    pub owner: Signer<'info>,
    /// The [System] program.
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct RegisterToken<'info> {
    /// Information about the [PrismToken].
    #[account(
        init,
        seeds = [
            b"PrismToken".as_ref(),
            token_mint.key().to_bytes().as_ref()
        ],
        bump = bump,
        payer = admin_authority,
    )]
    pub prism_token: Box<Account<'info, PrismToken>>,
    /// Authority that has admin rights over the [PrismToken].
    pub admin_authority: Signer<'info>,
    /// [Mint] of the [PrismToken].
    pub token_mint: Account<'info, Mint>,
    /// The [System] program.
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Convert<'info> {
    /// The [Prism] authority account
    #[account(
        seeds = [
            b"Prism".as_ref(),
        ],
        bump = prism.bump,
    )]
    pub prism: Account<'info, Prism>,

    #[account(
        seeds = [
            b"PrismToken".as_ref(),
            from_mint.key().to_bytes().as_ref()
        ],
        bump = from_token.bump
    )]
    /// The [PrismToken] [Account] used for calculating the incoming tokens to burn
    pub from_token: Box<Account<'info, PrismToken>>,

    /// The [Mint] of the burned tokens
    pub from_mint: Account<'info, Mint>,

    /// The paying [TokenAccount]
    #[account(owner = payer.key())]
    #[account(associated_token::mint = from_mint, associated_token::authority = prism)]
    pub from: Account<'info, TokenAccount>,

    #[account(
        seeds = [
            b"PrismToken".as_ref(),
            to_mint.key().to_bytes().as_ref()
        ],
        bump = to_token.bump
    )]
    /// The [PrismToken] [Account] used for calculating the outgoing tokens to mint
    pub to_token: Box<Account<'info, PrismToken>>,

    /// The [Mint] of the minted tokens
    pub to_mint: Account<'info, Mint>,

    /// The receiving [Account]
    #[account(associated_token::mint = to_mint, associated_token::authority = prism)]
    pub to: Account<'info, TokenAccount>,

    /// The payer ([Signer]) of the tx
    pub payer: Signer<'info>,

    /// The [Token] [Program].
    pub token_program: Program<'info, Token>,

    /// The [AssociatedToken] [Program]
    pub associated_program: Program<'info, AssociatedToken>,
}
