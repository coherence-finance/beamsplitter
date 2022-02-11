//pub mod anchor_swap;
pub mod context;
pub mod errors;
pub mod state;
pub mod util;

use anchor_lang::prelude::*;
use anchor_spl::dex;
use bigdecimal::*;
use context::*;
use errors::BeamsplitterErrors;
use rust_decimal::*;
use state::*;
use util::get_slab_price;

declare_id!("4WWKCwKfhz7cVkd4sANskBk3y2aG9XpZ3fGSQcW1yTBB");

#[program]
pub mod coherence_beamsplitter {
    use anchor_spl::token::{accessor::authority, burn, mint_to, transfer, Burn, MintTo, Transfer};
    use rust_decimal::prelude::{ToPrimitive, Zero};
    use serum_dex::state::MarketState;

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
        let amount = BigDecimal::from(ctx.accounts.buyer_token.delegated_amount);

        let buyer_token = &ctx.accounts.buyer_token;
        let weighted_tokens = &ctx.accounts.prism_etf.weighted_tokens;
        let beamsplitter = &ctx.accounts.beamsplitter;

        // Sum all weights * max bid prices together
        let mut weighted_sum = BigDecimal::zero();

        for (idx, weighted_token) in weighted_tokens.iter().enumerate() {
            let market_account = &ctx.remaining_accounts[idx * 3];
            let bids_account = &ctx.remaining_accounts[idx * 3 + 1];
            let market = &MarketState::load(market_account, &dex::id(), false)?;
            let bids = &market.load_bids_mut(bids_account)?;
            let max_bid = BigDecimal::from(get_slab_price(bids)?);

            weighted_sum += BigDecimal::from(weighted_token.weight) * max_bid;
        }

        for (idx, &weighted_token) in ctx.accounts.prism_etf.weighted_tokens.iter().enumerate() {
            let portion_amount;

            {
                // Get Max Ask Price
                let market_account = &ctx.remaining_accounts[idx * 3];
                let bids_account = &ctx.remaining_accounts[idx * 3 + 1];
                let asks_account = &ctx.remaining_accounts[idx * 3 + 2];
                let market = &MarketState::load(market_account, &dex::id(), false)?;

                let bids = &market.load_bids_mut(bids_account)?;
                let max_bid = &BigDecimal::from(get_slab_price(&bids)?);

                let asks = &market.load_asks_mut(asks_account)?;
                let min_ask = &BigDecimal::from(get_slab_price(&asks)?);

                let _slippage = &(min_ask - max_bid);

                let weight = &BigDecimal::from(weighted_token.weight);
                portion_amount = &amount * (weight / &weighted_sum);
            }

            {
                // Transfer from buyer to Beamsplitter
                let transfer_accounts = Transfer {
                    to: ctx.accounts.beamsplitter_token.to_account_info(),
                    from: buyer_token.to_account_info(),
                    authority: ctx.accounts.usdc_token_authority.to_account_info(),
                };

                let transfer_ctx = CpiContext::new(
                    ctx.accounts.token_program.to_account_info(),
                    transfer_accounts,
                );

                let transfer_amount = &portion_amount
                    .to_u64()
                    .ok_or(ProgramError::InvalidArgument)?;

                transfer(transfer_ctx, *transfer_amount)?;
            }

            // Make buy call

            // Transfer out difference between max_ask and max_bid

            {
                // Mint
                let mint_accounts = MintTo {
                    mint: ctx.accounts.prism_etf_mint.to_account_info(),
                    to: ctx.accounts.reciever_token.to_account_info(),
                    authority: beamsplitter.to_account_info(),
                };

                let mint_to_ctx =
                    CpiContext::new(ctx.accounts.token_program.to_account_info(), mint_accounts);

                let mint_amount = amount.to_u64().ok_or(ProgramError::InvalidArgument)?;

                mint_to(mint_to_ctx, mint_amount)?;
            }
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

    // TODO: Instruction for user selling their etf tokens
    pub fn sell(ctx: Context<Sell>) -> ProgramResult {
        let beamsplitter = &mut ctx.accounts.beamsplitter;
        let seller = &mut ctx.accounts.seller;
        let seller_token = &mut ctx.accounts.seller_token;
        let placeholder_amount = 10;

        // user hits sell instruction to sell their prism etf tokens
        // we sell the specified value of the underlying assets of the prism etf tokens into USDC (Bitcoin, Eth, Solana, etc)
        //// cpi call to new_order to sell

        // Assign seed values
        let seeds = &[PDA_SEED, &[beamsplitter.bump]];
        let signer_seeds = &[&seeds[..]];

        // We transfer the value in USDC of the underlying assets to the user's account
        // Accounts used by transfer cpi instruction
        let transfer_accounts = Transfer {
            from: seller_token.to_account_info(),
            to: seller.to_account_info(),
            authority: beamsplitter.to_account_info(),
        };

        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            transfer_accounts,
            signer_seeds,
        );

        transfer(transfer_ctx, placeholder_amount)?;

        // We burn the prism etf tokens the user is selling
        //// Cpi anchor spl program to burn prism etf tokens
        // Accounts used by burn cpi instruction
        let burn_accounts = Burn {
            mint: ctx.accounts.token_mint.to_account_info(),
            to: ctx.accounts.prism_etf.to_account_info(),
            authority: beamsplitter.to_account_info(),
        };

        let burn_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            burn_accounts,
            signer_seeds,
        );

        burn(burn_ctx, placeholder_amount)?;

        Ok(())
    }
}
