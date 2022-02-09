pub mod asset_source;
pub mod context;
pub mod errors;
pub mod state;
pub mod util;

use anchor_lang::prelude::*;
use asset_source::*;
use context::*;
use errors::BeamsplitterErrors;
use util::token_value;

declare_id!("4WWKCwKfhz7cVkd4sANskBk3y2aG9XpZ3fGSQcW1yTBB");

#[program]
pub mod coherence_beamsplitter {

    use anchor_spl::token::{accessor::authority, burn, mint_to, Burn, MintTo};
    use asset_source::AssetSource;

    use super::*;

    const PDA_SEED: &[u8] = b"Beamsplitter" as &[u8];

    /// Initializes the Beamsplitter program state
    pub fn initialize(ctx: Context<Initialize>, bump: u8) -> ProgramResult {
        let beamsplitter = &mut ctx.accounts.beamsplitter;
        beamsplitter.bump = bump;
        beamsplitter.owner = ctx.accounts.owner.key();

        Ok(())
    }

    /// Registers a new Prism ETF
    pub fn register_token(
        ctx: Context<RegisterToken>,
        bump: u8,
        assets: Vec<AssetSource>,
    ) -> ProgramResult {
        let prism_etf = &mut ctx.accounts.prism_etf;
        let prism_metadata = &ctx.accounts.beamsplitter;
        let mint = &ctx.accounts.token_mint;
        let signer = &ctx.accounts.admin_authority;

        prism_etf.authority = ctx.accounts.admin_authority.key();
        prism_etf.bump = bump;
        prism_etf.mint = ctx.accounts.token_mint.key();
        prism_etf.prism_etf = prism_metadata.key();

        // If Beamsplitter does not have authority over token and signer of TX is not Beamsplitter owner
        if prism_metadata.owner != authority(&mint.to_account_info())?
            && signer.key() != prism_metadata.owner
        {
            return Err(BeamsplitterErrors::NotMintAuthority.into());
        }

        // TODO check if supply is zero

        for i in 0..assets.len() {
            prism_etf.assets[i] = assets[i];
        }

        // TODO Add token address to a registry account

        Ok(())
    }

    /// Converts one prism etf to another
    #[inline(never)]
    pub fn convert(ctx: Context<Convert>, from_amount: u64) -> ProgramResult {
        let beamsplitter = &mut ctx.accounts.beamsplitter;
        let from_asset_value = token_value(&ctx.accounts.from_token.assets) as u64;
        let to_asset_value = token_value(&ctx.accounts.to_token.assets) as u64;

        if &ctx.accounts.from_mint.key() == &ctx.accounts.to_mint.key() {
            return Err(BeamsplitterErrors::NoSameMintAccounts.into());
        }

        // Amount of value being transferred
        let effective_value = from_amount * from_asset_value;
        // Amount of outgoing tokens to mint
        let to_amount = effective_value / to_asset_value;

        // Accounts used by burn cpi instruction
        let burn_accounts = Burn {
            mint: ctx.accounts.from_mint.to_account_info(),
            to: ctx.accounts.from.to_account_info(),
            authority: beamsplitter.to_account_info(),
        };

        // Accounts used by mint cpi instruction
        let mint_accounts = MintTo {
            mint: ctx.accounts.to_mint.to_account_info(),
            to: ctx.accounts.to.to_account_info(),
            authority: beamsplitter.to_account_info(),
        };

        let seeds = &[PDA_SEED, &[beamsplitter.bump]];
        let signer_seeds = &[&seeds[..]];

        let burn_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            burn_accounts,
            signer_seeds,
        );
        burn(burn_ctx, from_amount)?;

        let mint_to_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            mint_accounts,
            signer_seeds,
        );
        mint_to(mint_to_ctx, to_amount)?;

        Ok(())
    }
}
