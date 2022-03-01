//pub mod anchor_swap;
pub mod context;
pub mod dex;
pub mod errors;
pub mod state;
pub mod swap;
pub mod util;

use anchor_lang::prelude::*;
use anchor_spl::token;
use context::*;
use errors::BeamsplitterErrors;
use state::*;
use swap::*;
use util::get_slab_price;

declare_id!("4WWKCwKfhz7cVkd4sANskBk3y2aG9XpZ3fGSQcW1yTBB");

#[program]
pub mod coherence_beamsplitter {
    use std::mem::size_of;

    use anchor_spl::token::{accessor::authority, burn, mint_to, transfer, Burn, MintTo, Transfer};
    use rust_decimal::{
        prelude::{ToPrimitive, Zero},
        Decimal,
    };
    use serum_dex::state::MarketState;

    const PDA_SEED: &[u8] = b"Beamsplitter" as &[u8];

    use super::*;

    /// Initializes the Beamsplitter program state
    pub fn initialize(ctx: Context<Initialize>, bump: u8) -> ProgramResult {
        let beamsplitter = &mut ctx.accounts.beamsplitter;
        beamsplitter.bump = bump;
        beamsplitter.owner = ctx.accounts.owner.key();

        Ok(())
    }

    /*pub fn init_weighted_tokens(
        ctx: Context<WeightedTokensInit>,
        bump: u8,
        tokens: Vec<WeightedToken>,
    ) -> ProgramResult {
        if tokens.len() >= 1024 {
            return Err(ProgramError::InvalidArgument);
        }
        let arr_account = &mut ctx.accounts.weighted_tokens.load_init()?;
        arr_account.index = tokens.len() as u32;
        for (idx, &weighted_token) in tokens.iter().enumerate() {
            arr_account.weighted_tokens[idx] = weighted_token;
        }
        Ok(())
    }*/

    /// Registers a new Prism ETF
    pub fn register_token(
        ctx: Context<RegisterToken>,
        bump: u8,
        weighted_tokens: Vec<WeightedToken>,
    ) -> ProgramResult {
        msg![&size_of::<PrismEtf>().to_string()[..]];
        let prism_etf = &mut ctx.accounts.prism_etf.load_init()?;
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

    pub fn buy<'info>(ctx: Context<'_, '_, '_, 'info, Buy<'info>>) -> ProgramResult {
        let prism_etf = &ctx.accounts.prism_etf.load()?;

        // Get's amount approved to buy
        let amount = Decimal::from(ctx.accounts.buyer_token.delegated_amount);

        let mkt_accts = util::extract_market_accounts(ctx.remaining_accounts)?;

        let buyer_token = &ctx.accounts.buyer_token;
        let weighted_tokens = &prism_etf.weighted_tokens;
        let beamsplitter = &ctx.accounts.beamsplitter;

        // Sum all weights * max bid prices together
        let mut weighted_sum = Decimal::zero();

        for idx in 0..mkt_accts.len() {
            let market_account = &mkt_accts[idx].market;
            let bids_account = &mkt_accts[idx].bids;
            let market = &MarketState::load(market_account, &dex::id(), false)?;
            let bids = &market.load_bids_mut(bids_account)?;
            let max_bid = Decimal::from(get_slab_price(bids)?);

            weighted_sum += Decimal::from(weighted_tokens[idx].weight) * max_bid;
        }

        for idx in 0..mkt_accts.len() {
            let portion_amount;
            let max_bid;

            {
                // Get Max Ask Price
                let market_account = &mkt_accts[idx].market;
                let bids_account = &mkt_accts[idx].bids;
                let asks_account = &mkt_accts[idx].asks;
                let market = &MarketState::load(market_account, &dex::id(), false)?;

                let bids = &market.load_bids_mut(bids_account)?;

                // TODO max bid is computed in weighted sum for loop, we should allocate a Box and store these to reduce recomputing
                max_bid = Decimal::from(get_slab_price(&bids)?);

                let asks = &market.load_asks_mut(asks_account)?;
                let min_ask = &Decimal::from(get_slab_price(&asks)?);

                let _slippage = &(min_ask - max_bid);

                // let weight = &Decimal::from(weighted_token.weight);
                // portion_amount = &amount * (weight / &weighted_sum);
                // TODO: Remove after testing
                let weight = Decimal::from(50);
                portion_amount = weight;
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

            {
                // Make buy call
                let orderbook = OrderbookClient {
                    market: mkt_accts[idx].clone(),
                    authority: ctx.accounts.buyer.to_account_info(),
                    pc_wallet: ctx.accounts.beamsplitter_token.to_account_info(),
                    dex_program: ctx.accounts.dex_program.to_account_info(),
                    token_program: ctx.accounts.token_program.to_account_info(),
                    rent: ctx.accounts.rent.to_account_info(),
                };
                orderbook.buy(portion_amount.to_u64().unwrap(), None)?;
                orderbook.settle(None)?;
            }

            // Transfer out difference between max_ask and max_bid

            {
                // Mint
                let mint_accounts = MintTo {
                    mint: ctx.accounts.prism_etf_mint.to_account_info(),
                    to: ctx.accounts.reciever_token.to_account_info(),
                    authority: beamsplitter.to_account_info(),
                };

                let seeds = &[PDA_SEED, &[beamsplitter.bump]];
                let signer_seeds = &[&seeds[..]];

                let mint_to_ctx = CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    mint_accounts,
                    signer_seeds,
                );

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

    /*
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
    }*/

    /// Swaps two tokens on a single A/B market, where A is the base currency
    /// and B is the quote currency. This is just a direct IOC trade that
    /// instantly settles.
    ///
    /// When side is "bid", then swaps B for A. When side is "ask", then swaps
    /// A for B.
    ///
    /// Arguments:
    ///
    /// * `side`                     - The direction to swap.
    /// * `amount`                   - The amount to swap *from*
    /// * `min_expected_swap_amount` - The minimum amount of the *to* token the
    ///    client expects to receive from the swap. The instruction fails if
    ///    execution would result in less.
    #[access_control(is_valid_swap(&ctx))]
    pub fn swap<'info>(
        ctx: Context<'_, '_, '_, 'info, Swap<'info>>,
        side: Side,
        amount: u64,
        min_expected_swap_amount: u64,
    ) -> ProgramResult {
        // Optional referral account (earns a referral fee).
        let referral = ctx.remaining_accounts.iter().next().map(Clone::clone);

        // Side determines swap direction.
        let (from_token, to_token) = match side {
            Side::Bid => (&ctx.accounts.pc_wallet, &ctx.accounts.market.coin_wallet),
            Side::Ask => (&ctx.accounts.market.coin_wallet, &ctx.accounts.pc_wallet),
        };

        // Token balances before the trade.
        let from_amount_before = token::accessor::amount(from_token)?;
        let to_amount_before = token::accessor::amount(to_token)?;

        // Execute trade.
        let orderbook: OrderbookClient<'info> = (&*ctx.accounts).into();
        match side {
            Side::Bid => orderbook.buy(amount, referral.clone())?,
            Side::Ask => orderbook.sell(amount, referral.clone())?,
        };
        orderbook.settle(referral)?;

        // Token balances after the trade.
        let from_amount_after = token::accessor::amount(from_token)?;
        let to_amount_after = token::accessor::amount(to_token)?;

        //  Calculate the delta, i.e. the amount swapped.
        let from_amount = from_amount_before.checked_sub(from_amount_after).unwrap();
        let to_amount = to_amount_after.checked_sub(to_amount_before).unwrap();

        // Safety checks.
        apply_risk_checks(DidSwap {
            authority: *ctx.accounts.authority.key,
            given_amount: amount,
            min_expected_swap_amount,
            from_amount,
            to_amount,
            spill_amount: 0,
            from_mint: token::accessor::mint(from_token)?,
            to_mint: token::accessor::mint(to_token)?,
            quote_mint: match side {
                Side::Bid => token::accessor::mint(from_token)?,
                Side::Ask => token::accessor::mint(to_token)?,
            },
        })?;

        Ok(())
    }
}
