pub mod asset_data;
pub mod context;
pub mod state;
pub mod util;

use anchor_lang::prelude::*;
use asset_data::*;
use context::*;
use util::token_value;

declare_id!("4WWKCwKfhz7cVkd4sANskBk3y2aG9XpZ3fGSQcW1yTBB");

#[program]
pub mod splitcoin_prism {

    use anchor_spl::token::{burn, mint_to, Burn, MintTo};
    use asset_data::AssetData;

    use super::*;

    /// Initializes the Prism program state
    pub fn initialize(ctx: Context<Initialize>, bump: u8) -> ProgramResult {
        let prism = &mut ctx.accounts.prism;
        prism.bump = bump;
        prism.owner = ctx.accounts.owner.key();

        Ok(())
    }

    /// Registers a new Prism Token
    pub fn register_token(
        ctx: Context<RegisterToken>,
        bump: u8,
        assets: Vec<AssetData>,
    ) -> ProgramResult {
        let prism = &mut ctx.accounts.prism_token;

        prism.authority = ctx.accounts.admin_authority.key();
        prism.bump = bump;
        prism.mint = ctx.accounts.token_mint.key();

        for i in 0..assets.len() {
            prism.assets[i] = assets[i];
        }

        // TODO Add token address to a registry account

        Ok(())
    }

    /// Converts one prism token to another
    #[inline(never)]
    pub fn convert(ctx: Context<Convert>, from_amount: u64) -> ProgramResult {
        let from_asset_value = token_value(&ctx.accounts.from_token.assets) as u64;
        let to_asset_value = token_value(&ctx.accounts.to_token.assets) as u64;

        // Amount of value being transferred
        let effective_value = from_amount * from_asset_value;
        // Amount of outgoing tokens to mint
        let to_amount = effective_value / to_asset_value;

        // Accounts used by burn cpi instruction
        let burn_accounts = Burn {
            mint: ctx.accounts.from_mint.to_account_info(),
            to: ctx.accounts.from.to_account_info(),
            authority: ctx.accounts.prism.to_account_info(),
        };

        // Accounts used by mint cpi instruction
        let mint_accounts = MintTo {
            mint: ctx.accounts.to_mint.to_account_info(),
            to: ctx.accounts.to.to_account_info(),
            authority: ctx.accounts.prism.to_account_info(),
        };

        let burn_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), burn_accounts);
        burn(burn_ctx, from_amount)?;

        let mint_to_ctx =
            CpiContext::new(ctx.accounts.token_program.to_account_info(), mint_accounts);
        mint_to(mint_to_ctx, to_amount)?;

        Ok(())
    }
}
