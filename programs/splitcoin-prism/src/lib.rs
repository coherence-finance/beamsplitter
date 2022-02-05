pub mod asset_data;
mod context;
mod state;

use crate::asset_data::*;
use anchor_lang::prelude::*;
use context::*;

declare_id!("4WWKCwKfhz7cVkd4sANskBk3y2aG9XpZ3fGSQcW1yTBB");

#[program]
pub mod splitcoin_prism {

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
    #[inline(never)]
    pub fn register_token(
        ctx: Context<RegisterToken>,
        bump: u8,
        assets: Vec<AssetData>,
    ) -> ProgramResult {
        let prism = &mut ctx.accounts.prism_token;

        prism.authority = ctx.accounts.admin_authority.key();
        prism.bump = bump;
        prism.mint = ctx.accounts.token_mint.key();

        prism.assets = assets;

        Ok(())
    }

    #[inline(never)]
    pub fn convert(ctx: Context<Convert>) -> ProgramResult {
        //let prism
        Ok(())
    }
}
