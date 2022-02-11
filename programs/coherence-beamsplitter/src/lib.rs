//pub mod anchor_swap;
pub mod context;
pub mod errors;
pub mod state;
pub mod util;

use anchor_lang::prelude::*;
use anchor_spl::dex;
use context::*;
use errors::BeamsplitterErrors;
use rust_decimal::*;
use state::*;
use util::get_slab_price;

declare_id!("4WWKCwKfhz7cVkd4sANskBk3y2aG9XpZ3fGSQcW1yTBB");

#[program]
pub mod coherence_beamsplitter {

    use anchor_spl::token::{accessor::authority, mint_to, transfer, MintTo, Transfer};
    use rust_decimal::prelude::ToPrimitive;
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
        let beamsplitter = &ctx.accounts.beamsplitter;
        let mint = &ctx.accounts.token_mint;
        let signer = &ctx.accounts.admin_authority;

        prism_etf.authority = ctx.accounts.admin_authority.key();
        prism_etf.bump = bump;
        prism_etf.mint = ctx.accounts.token_mint.key();
        prism_etf.prism_etf = beamsplitter.key();

        // If Beamsplitter does not have authority over token and signer of TX is not Beamsplitter owner
        if beamsplitter.owner != authority(&mint.to_account_info())?
            && signer.key() != beamsplitter.owner
        {
            return Err(BeamsplitterErrors::NotMintAuthority.into());
        }

        // TODO ensure all of weighted token pairs have USDC as base token
        for i in 0..weighted_tokens.len() {
            prism_etf.weighted_tokens[i] = weighted_tokens[i];
        }

        // TODO Add token address to a registry account

        Ok(())
    }

    pub fn buy(ctx: Context<Buy>) -> ProgramResult {
        // Get's amount approved to buy
        let amount = Decimal::from(ctx.accounts.buyer_token.delegated_amount);

        let buyer_token = &ctx.accounts.buyer_token;
        let weighted_tokens = &ctx.accounts.prism_etf.weighted_tokens;
        let beamsplitter = &ctx.accounts.beamsplitter;

        // Sum all weights together using fold (reduce, essentially)
        let weights_sum = Decimal::from(weighted_tokens.iter().fold(0, |sum, weighted_token| {
            return weighted_token.weight + sum;
        }));

        for weighted_token in ctx.accounts.prism_etf.weighted_tokens {
            let weight = Decimal::from(weighted_token.weight);
            let portion_amount = amount * (weight / weights_sum);

            // Transfer from buyer to Beamspliter
            let transfer_accounts = Transfer {
                to: beamsplitter.to_account_info(),
                from: buyer_token.to_account_info(),
                authority: ctx.accounts.usdc_token_authority.to_account_info(),
            };

            let transfer_ctx = CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                transfer_accounts,
            );

            let transfer_amount = amount.to_u64().ok_or(ProgramError::InvalidArgument)?;

            transfer(transfer_ctx, transfer_amount)?;

            // Make buy call
            ctx.remaining_accounts.iter().map(|account| {});

            // Mint
            let mint_accounts = MintTo {
                mint: ctx.accounts.prism_etf_mint.to_account_info(),
                to: ctx.accounts.buyer_token.to_account_info(),
                authority: beamsplitter.to_account_info(),
            };

            let mint_to_ctx =
                CpiContext::new(ctx.accounts.token_program.to_account_info(), mint_accounts);

            let mint_amount = amount.to_u64().ok_or(ProgramError::InvalidArgument)?;

            mint_to(mint_to_ctx, mint_amount)?;
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
