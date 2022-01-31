mod context;
mod state;
pub mod asset_data;

use anchor_lang::prelude::*;
use context::*;

declare_id!("4WWKCwKfhz7cVkd4sANskBk3y2aG9XpZ3fGSQcW1yTBB");

#[program]
pub mod splitcoin_prism {

    use super::*;

    /// Initializes the Prism program state
    pub fn initialize(ctx: Context<Initialize>, bump: u8) -> ProgramResult {
        let prism = &mut ctx.accounts.prism;
        prism.bump = bump;
        prism.owner = ctx.accounts.owner.key();

        Ok(())
    }

    /// Provisions a new PrismAsset
    pub fn new_asset(ctx: Context<NewAsset>, bump: u8) -> ProgramResult {
        let prism = &mut ctx.accounts.prism_asset;

        prism.authority = ctx.accounts.admin_authority.key();
        prism.bump = bump;
        prism.mint = ctx.accounts.asset_mint.key();

        Ok(())
    }

    pub fn convert(ctx: Context<Convert>) -> ProgramResult {

        Ok(())
    }

}
