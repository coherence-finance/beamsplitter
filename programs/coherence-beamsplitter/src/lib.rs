//pub mod anchor_swap;
pub mod context;
pub mod errors;
pub mod state;
pub mod util;

use anchor_lang::prelude::*;
//use anchor_swap::*;
use context::*;
use errors::BeamsplitterErrors;
use state::*;
use util::get_slab_price;

declare_id!("4WWKCwKfhz7cVkd4sANskBk3y2aG9XpZ3fGSQcW1yTBB");

#[program]
pub mod coherence_beamsplitter {

    use anchor_spl::token::accessor::authority;
    use serum_dex::state::MarketState;

    use super::*;

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
        weighted_tokens: Vec<WeightedToken>,
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

        for i in 0..weighted_tokens.len() {
            prism_etf.weighted_tokens[i] = weighted_tokens[i];
        }

        // TODO Add token address to a registry account

        Ok(())
    }

    pub fn intialize_deposit(ctx: Context<InitializeDeposit>, bump: u8) -> ProgramResult {
        let deposit = &mut ctx.accounts.deposit;
        deposit.bump = bump;
        deposit.depositor = ctx.accounts.payer.key();
        Ok(())
    }

    pub fn buy(ctx: Context<Buy>, amount: u32) -> ProgramResult {
        let deposit_token_account = &ctx.accounts.deposit_token;

        if deposit_token_account.amount <= 0 {
            return Err(BeamsplitterErrors::EmptyDeposit.into());
        }

        let weighted_tokens = &ctx.accounts.prism_etf.weighted_tokens;

        // Sum all weights together using fold (reduce, essentially)
        let weights_sum = weighted_tokens.iter().fold(0, |sum, weighted_token| {
            return weighted_token.weight + sum;
        });

        for weighted_token in ctx.accounts.prism_etf.weighted_tokens {
            let weight = weighted_token.weight;
            let portion_amount =
                (f64::from(weight) / f64::from(weights_sum) * f64::from(amount)) as u32;
        }

        Ok(())
    }

    // TODO: Factor in decimals into price
    pub fn get_price(ctx: Context<GetPrice>, dex_pid: Pubkey) -> ProgramResult {
        let price_account = &mut ctx.accounts.price;

        let market_account = &ctx.remaining_accounts[0];
        let bids_account = &ctx.remaining_accounts[1];

        let market = MarketState::load(market_account, &dex_pid, false)?;
        let bids = market.load_bids_mut(bids_account)?;

        price_account.price = get_slab_price(&bids)?;

        Ok(())
    }
}
