pub mod asset_data;
pub mod context;
pub mod errors;
pub mod state;
pub mod util;

use anchor_lang::prelude::*;
use asset_data::*;
use context::*;
use errors::BeamsplitterErrors;
use util::*;

declare_id!("4WWKCwKfhz7cVkd4sANskBk3y2aG9XpZ3fGSQcW1yTBB");

#[program]
pub mod splitcoin_prism {

    use anchor_spl::token::{accessor::authority, burn, mint_to, Burn, MintTo};
    use asset_data::AssetData;
    use serum_dex::state::MarketState;

    use super::*;

    const PDA_SEED: &[u8] = b"Prism" as &[u8];

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
        let prism_metadata = &ctx.accounts.prism;
        let mint = &ctx.accounts.token_mint;
        let signer = &ctx.accounts.admin_authority;

        prism.authority = ctx.accounts.admin_authority.key();
        prism.bump = bump;
        prism.mint = ctx.accounts.token_mint.key();
        prism.prism = prism_metadata.key();

        // If Beamsplitter does not have authority over token and signer of TX is not Beamsplitter owner
        if prism_metadata.owner != authority(&mint.to_account_info())?
            && signer.key() != prism_metadata.owner
        {
            return Err(BeamsplitterErrors::NotMintAuthority.into());
        }

        // TODO check if supply is zero

        for i in 0..assets.len() {
            prism.assets[i] = assets[i];
        }

        // TODO Add token address to a registry account

        Ok(())
    }

    /// Converts one prism token to another
    #[inline(never)]
    pub fn convert(ctx: Context<Convert>, from_amount: u64) -> ProgramResult {
        let prism = &mut ctx.accounts.prism;
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
            authority: prism.to_account_info(),
        };

        // Accounts used by mint cpi instruction
        let mint_accounts = MintTo {
            mint: ctx.accounts.to_mint.to_account_info(),
            to: ctx.accounts.to.to_account_info(),
            authority: prism.to_account_info(),
        };

        let seeds = &[PDA_SEED, &[prism.bump]];
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

    // TODO: Factor in decimals into price
    pub fn get_price(ctx: Context<GetPrice>, dex_pid: Pubkey) -> ProgramResult {
        let price_account = &mut ctx.accounts.price;

        let market_account = &ctx.remaining_accounts[0];
        let bids_account = &ctx.remaining_accounts[1];

        let market = MarketState::load(market_account, &dex_pid, false)?;
        let bids = market.load_bids_mut(bids_account)?;

        price_account.price = get_slab_price(&bids);

        Ok(())
    }
}
