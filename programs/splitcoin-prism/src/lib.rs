mod context;
mod macros;
mod state;

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Burn, MintTo, Transfer};
use context::*;

declare_id!("4WWKCwKfhz7cVkd4sANskBk3y2aG9XpZ3fGSQcW1yTBB");

#[program]
pub mod splitcoin_prism {
    use super::*;

    /// Initializes the prism
    /// Bump is stored for efficient PDA calculations in other instructions
    pub fn initialize(ctx: Context<Initialize>, bump: u8) -> ProgramResult {
        let prism = &mut ctx.accounts.prism;

        prism.authority = ctx.accounts.admin_authority.key();
        prism.bump = bump;
        prism.mint = ctx.accounts.prism_mint.key();

        Ok(())
    }

    /// Transfers tokens from a source to a destination
    pub fn proxy_transfer(ctx: Context<ProxyTransfer>, amount: u64) -> ProgramResult {
        let seeds: &[&[u8]] = generate_prism_seeds!(ctx.accounts.prism);

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info().clone(),
                Transfer {
                    from: ctx.accounts.transfer_source.to_account_info().clone(),
                    to: ctx.accounts.transfer_destination.to_account_info().clone(),
                    authority: ctx.accounts.prism.to_account_info().clone(),
                },
                &[seeds],
            ),
            amount,
        )?;

        Ok(())
    }

    /// Mints tokens to a destination
    pub fn proxy_mint_to(ctx: Context<ProxyMintTo>, amount: u64) -> ProgramResult {
        let seeds: &[&[u8]] = generate_prism_seeds!(ctx.accounts.prism);

        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info().clone(),
                MintTo {
                    mint: ctx.accounts.prism_mint.to_account_info().clone(),
                    to: ctx.accounts.mint_destination.to_account_info().clone(),
                    authority: ctx.accounts.prism.to_account_info().clone(),
                },
                &[seeds],
            ),
            amount,
        )?;

        Ok(())
    }

    /// Burns tokens from a source
    pub fn proxy_burn(ctx: Context<ProxyBurn>, amount: u64) -> ProgramResult {
        let seeds: &[&[u8]] = generate_prism_seeds!(ctx.accounts.prism);

        token::burn(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info().clone(),
                Burn {
                    mint: ctx.accounts.prism_mint.to_account_info().clone(),
                    to: ctx.accounts.prism_source.to_account_info().clone(),
                    authority: ctx.accounts.prism.to_account_info().clone(),
                },
                &[seeds],
            ),
            amount,
        )?;

        Ok(())
    }
}
