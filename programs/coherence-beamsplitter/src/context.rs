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
#[instruction(bump: u8)]
pub struct InitializeDeposit<'info> {
    #[account(
        init,
        seeds = [
            b"Deposit".as_ref(),
            payer.key().to_bytes().as_ref(),
        ],
        bump,
        payer = payer,
    )]
    pub deposit: Account<'info, Deposit>,

    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Buy<'info> {
    #[account(
        seeds = [
            b"Deposit".as_ref(),
            depositor.key().to_bytes().as_ref(),
        ],
        bump,
        has_one = depositor,
    )]
    pub deposit: Account<'info, Deposit>,

    #[account(mut, associated_token::mint = mint::USDC, associated_token::authority = deposit)]
    pub deposit_token: Account<'info, TokenAccount>,

    #[account(owner = crate::ID)]
    pub prism_etf: Account<'info, PrismEtf>,

    pub depositor: Signer<'info>,

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
