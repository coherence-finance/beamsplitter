use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct Initialize<'info> {
    /// Information about the [SplitcoinPrism].
    #[account(
        init,
        seeds = [
            b"SplitcoinPrism".as_ref(),
            prism_mint.key().to_bytes().as_ref()
        ],
        bump = bump,
        payer = admin_authority,
    )]
    pub prism: Account<'info, SplitcoinPrism>,
    /// Authority that has admin rights over the [SplitcoinPrism].
    pub admin_authority: Signer<'info>,
    /// [Mint] of the [SplitcoinPrism].
    pub prism_mint: Account<'info, Mint>,
    /// The [System] program.
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ProxyTransfer<'info> {
    /// Information about the [SplitcoinPrism].
    #[account(mut)]
    pub prism: Account<'info, SplitcoinPrism>,
    /// Source of the tokens to be transferred.
    #[account(mut)]
    pub transfer_source: Account<'info, TokenAccount>,
    /// Destination of the transferred tokens.
    #[account(mut)]
    pub transfer_destination: Account<'info, TokenAccount>,
    /// [Token] program.
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ProxyMintTo<'info> {
    /// Information about the [SplitcoinPrism].
    #[account(mut)]
    pub prism: Account<'info, SplitcoinPrism>,
    #[account(mut)]
    /// [Mint] of the [SplitcoinPrism].
    pub prism_mint: Account<'info, Mint>,
    /// Destination of the minted tokens.
    #[account(mut)]
    pub mint_destination: Account<'info, TokenAccount>,
    /// [Token] program.
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ProxyBurn<'info> {
    /// Information about the [SplitcoinPrism].
    #[account(mut)]
    pub prism: Account<'info, SplitcoinPrism>,
    /// [Mint] of the [SplitcoinPrism].
    #[account(mut)]
    pub prism_mint: Account<'info, Mint>,
    /// Source of the prism tokens.
    #[account(mut)]
    pub prism_source: Account<'info, TokenAccount>,
    /// [Token] program.
    pub token_program: Program<'info, Token>,
}
