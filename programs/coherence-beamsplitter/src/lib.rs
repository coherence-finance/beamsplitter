//pub mod anchor_swap;
pub mod context;
pub mod dex;
pub mod errors;
pub mod state;
pub mod util;

use anchor_lang::prelude::*;
use anchor_spl::token;
use context::*;
use errors::BeamsplitterErrors;
use serum_dex::instruction::SelfTradeBehavior;
use serum_dex::matching::{OrderType, Side as SerumSide};
use serum_dex::state::MarketState;
use state::*;
use std::num::NonZeroU64;
use util::get_slab_price;

declare_id!("4WWKCwKfhz7cVkd4sANskBk3y2aG9XpZ3fGSQcW1yTBB");

#[program]
pub mod coherence_beamsplitter {
    use std::mem::size_of;

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

    /*  #[inline(never)]
    pub fn buy(ctx: Context<Buy>) -> ProgramResult {
        // Get's amount approved to buy
        let amount = Decimal::from(ctx.accounts.buyer_token.delegated_amount);

        let buyer_token = &ctx.accounts.buyer_token;
        let weighted_tokens = &ctx.accounts.prism_etf.weighted_tokens;
        let beamsplitter = &ctx.accounts.beamsplitter;

        // Sum all weights * max bid prices together
        let mut weighted_sum = Decimal::zero();

        for (idx, weighted_token) in weighted_tokens.iter().enumerate() {
            let market_account = &ctx.remaining_accounts[idx * 3];
            let bids_account = &ctx.remaining_accounts[idx * 3 + 1];
            let market = &MarketState::load(market_account, &dex::id(), false)?;
            let bids = &market.load_bids_mut(bids_account)?;
            let max_bid = Decimal::from(get_slab_price(bids)?);

            weighted_sum += Decimal::from(weighted_token.weight) * max_bid;
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
                let max_bid = &Decimal::from(get_slab_price(&bids)?);

                let asks = &market.load_asks_mut(asks_account)?;
                let min_ask = &Decimal::from(get_slab_price(&asks)?);

                let _slippage = &(min_ask - max_bid);

                let weight = &Decimal::from(weighted_token.weight);
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
    }*/

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
    ) -> Result<()> {
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

// Asserts the swap event is valid.
fn apply_risk_checks(event: DidSwap) -> Result<()> {
    // Reject if the resulting amount is less than the client's expectation.
    if event.to_amount < event.min_expected_swap_amount {
        return Err(ErrorCode::SlippageExceeded.into());
    }
    emit!(event);
    Ok(())
}

// The only constraint imposed on these accounts is that the market's base
// currency mint is not equal to the quote currency's. All other checks are
// done by the DEX on CPI.
#[derive(Accounts)]
pub struct Swap<'info> {
    market: MarketAccounts<'info>,
    #[account(signer)]
    authority: AccountInfo<'info>,
    #[account(mut)]
    pc_wallet: AccountInfo<'info>,
    // Programs.
    dex_program: AccountInfo<'info>,
    token_program: AccountInfo<'info>,
    // Sysvars.
    rent: AccountInfo<'info>,
}

impl<'info> From<&Swap<'info>> for OrderbookClient<'info> {
    fn from(accounts: &Swap<'info>) -> OrderbookClient<'info> {
        OrderbookClient {
            market: accounts.market.clone(),
            authority: accounts.authority.clone(),
            pc_wallet: accounts.pc_wallet.clone(),
            dex_program: accounts.dex_program.clone(),
            token_program: accounts.token_program.clone(),
            rent: accounts.rent.clone(),
        }
    }
}

// The only constraint imposed on these accounts is that the from market's
// base currency's is not equal to the to market's base currency. All other
// checks are done by the DEX on CPI (and the quote currency is ensured to be
// the same on both markets since there's only one account field for it).
#[derive(Accounts)]
pub struct SwapTransitive<'info> {
    from: MarketAccounts<'info>,
    to: MarketAccounts<'info>,
    // Must be the authority over all open orders accounts used.
    #[account(signer)]
    authority: AccountInfo<'info>,
    #[account(mut)]
    pc_wallet: AccountInfo<'info>,
    // Programs.
    dex_program: AccountInfo<'info>,
    token_program: AccountInfo<'info>,
    // Sysvars.
    rent: AccountInfo<'info>,
}

impl<'info> SwapTransitive<'info> {
    fn orderbook_from(&self) -> OrderbookClient<'info> {
        OrderbookClient {
            market: self.from.clone(),
            authority: self.authority.clone(),
            pc_wallet: self.pc_wallet.clone(),
            dex_program: self.dex_program.clone(),
            token_program: self.token_program.clone(),
            rent: self.rent.clone(),
        }
    }
    fn orderbook_to(&self) -> OrderbookClient<'info> {
        OrderbookClient {
            market: self.to.clone(),
            authority: self.authority.clone(),
            pc_wallet: self.pc_wallet.clone(),
            dex_program: self.dex_program.clone(),
            token_program: self.token_program.clone(),
            rent: self.rent.clone(),
        }
    }
}

// Client for sending orders to the Serum DEX.
struct OrderbookClient<'info> {
    market: MarketAccounts<'info>,
    authority: AccountInfo<'info>,
    pc_wallet: AccountInfo<'info>,
    dex_program: AccountInfo<'info>,
    token_program: AccountInfo<'info>,
    rent: AccountInfo<'info>,
}

impl<'info> OrderbookClient<'info> {
    // Executes the sell order portion of the swap, purchasing as much of the
    // quote currency as possible for the given `base_amount`.
    //
    // `base_amount` is the "native" amount of the base currency, i.e., token
    // amount including decimals.
    fn sell(&self, base_amount: u64, referral: Option<AccountInfo<'info>>) -> ProgramResult {
        let limit_price = 1;
        let max_coin_qty = {
            // The loaded market must be dropped before CPI.
            let market = MarketState::load(&self.market.market, &dex::ID, false)?;
            coin_lots(&market, base_amount)
        };
        let max_native_pc_qty = u64::MAX;
        self.order_cpi(
            limit_price,
            max_coin_qty,
            max_native_pc_qty,
            Side::Ask,
            referral,
        )
    }

    // Executes the buy order portion of the swap, purchasing as much of the
    // base currency as possible, for the given `quote_amount`.
    //
    // `quote_amount` is the "native" amount of the quote currency, i.e., token
    // amount including decimals.
    fn buy(&self, quote_amount: u64, referral: Option<AccountInfo<'info>>) -> ProgramResult {
        let limit_price = u64::MAX;
        let max_coin_qty = u64::MAX;
        let max_native_pc_qty = quote_amount;
        self.order_cpi(
            limit_price,
            max_coin_qty,
            max_native_pc_qty,
            Side::Bid,
            referral,
        )
    }

    // Executes a new order on the serum dex via CPI.
    //
    // * `limit_price` - the limit order price in lot units.
    // * `max_coin_qty`- the max number of the base currency lot units.
    // * `max_native_pc_qty` - the max number of quote currency in native token
    //                         units (includes decimals).
    // * `side` - bid or ask, i.e. the type of order.
    // * `referral` - referral account, earning a fee.
    fn order_cpi(
        &self,
        limit_price: u64,
        max_coin_qty: u64,
        max_native_pc_qty: u64,
        side: Side,
        referral: Option<AccountInfo<'info>>,
    ) -> ProgramResult {
        // Client order id is only used for cancels. Not used here so hardcode.
        let client_order_id = 0;
        // Limit is the dex's custom compute budge parameter, setting an upper
        // bound on the number of matching cycles the program can perform
        // before giving up and posting the remaining unmatched order.
        let limit = 65535;

        let dex_accs = dex::NewOrderV3 {
            market: self.market.market.clone(),
            open_orders: self.market.open_orders.clone(),
            request_queue: self.market.request_queue.clone(),
            event_queue: self.market.event_queue.clone(),
            market_bids: self.market.bids.clone(),
            market_asks: self.market.asks.clone(),
            order_payer_token_account: self.market.order_payer_token_account.clone(),
            open_orders_authority: self.authority.clone(),
            coin_vault: self.market.coin_vault.clone(),
            pc_vault: self.market.pc_vault.clone(),
            token_program: self.token_program.clone(),
            rent: self.rent.clone(),
        };
        let mut ctx = CpiContext::new(self.dex_program.clone(), dex_accs);
        if let Some(referral) = referral {
            ctx = ctx.with_remaining_accounts(vec![referral]);
        }
        dex::new_order_v3(
            ctx,
            side.into(),
            NonZeroU64::new(limit_price).unwrap(),
            NonZeroU64::new(max_coin_qty).unwrap(),
            NonZeroU64::new(max_native_pc_qty).unwrap(),
            SelfTradeBehavior::DecrementTake,
            OrderType::ImmediateOrCancel,
            client_order_id,
            limit,
        )
    }

    fn settle(&self, referral: Option<AccountInfo<'info>>) -> ProgramResult {
        let settle_accs = dex::SettleFunds {
            market: self.market.market.clone(),
            open_orders: self.market.open_orders.clone(),
            open_orders_authority: self.authority.clone(),
            coin_vault: self.market.coin_vault.clone(),
            pc_vault: self.market.pc_vault.clone(),
            coin_wallet: self.market.coin_wallet.clone(),
            pc_wallet: self.pc_wallet.clone(),
            vault_signer: self.market.vault_signer.clone(),
            token_program: self.token_program.clone(),
        };
        let mut ctx = CpiContext::new(self.dex_program.clone(), settle_accs);
        if let Some(referral) = referral {
            ctx = ctx.with_remaining_accounts(vec![referral]);
        }
        dex::settle_funds(ctx)
    }
}

// Returns the amount of lots for the base currency of a trade with `size`.
fn coin_lots(market: &MarketState, size: u64) -> u64 {
    size.checked_div(market.coin_lot_size).unwrap()
}

// Market accounts are the accounts used to place orders against the dex minus
// common accounts, i.e., program ids, sysvars, and the `pc_wallet`.
#[derive(Accounts, Clone)]
pub struct MarketAccounts<'info> {
    #[account(mut)]
    market: AccountInfo<'info>,
    #[account(mut)]
    open_orders: AccountInfo<'info>,
    #[account(mut)]
    request_queue: AccountInfo<'info>,
    #[account(mut)]
    event_queue: AccountInfo<'info>,
    #[account(mut)]
    bids: AccountInfo<'info>,
    #[account(mut)]
    asks: AccountInfo<'info>,
    // The `spl_token::Account` that funds will be taken from, i.e., transferred
    // from the user into the market's vault.
    //
    // For bids, this is the base currency. For asks, the quote.
    #[account(mut)]
    order_payer_token_account: AccountInfo<'info>,
    // Also known as the "base" currency. For a given A/B market,
    // this is the vault for the A mint.
    #[account(mut)]
    coin_vault: AccountInfo<'info>,
    // Also known as the "quote" currency. For a given A/B market,
    // this is the vault for the B mint.
    #[account(mut)]
    pc_vault: AccountInfo<'info>,
    // PDA owner of the DEX's token accounts for base + quote currencies.
    vault_signer: AccountInfo<'info>,
    // User wallets.
    #[account(mut)]
    coin_wallet: AccountInfo<'info>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub enum Side {
    Bid,
    Ask,
}

impl From<Side> for SerumSide {
    fn from(side: Side) -> SerumSide {
        match side {
            Side::Bid => SerumSide::Bid,
            Side::Ask => SerumSide::Ask,
        }
    }
}

// Access control modifiers.

fn is_valid_swap(ctx: &Context<Swap>) -> Result<()> {
    _is_valid_swap(&ctx.accounts.market.coin_wallet, &ctx.accounts.pc_wallet)
}

fn is_valid_swap_transitive(ctx: &Context<SwapTransitive>) -> Result<()> {
    _is_valid_swap(&ctx.accounts.from.coin_wallet, &ctx.accounts.to.coin_wallet)
}

// Validates the tokens being swapped are of different mints.
fn _is_valid_swap<'info>(from: &AccountInfo<'info>, to: &AccountInfo<'info>) -> Result<()> {
    let from_token_mint = token::accessor::mint(from)?;
    let to_token_mint = token::accessor::mint(to)?;
    if from_token_mint == to_token_mint {
        return Err(ErrorCode::SwapTokensCannotMatch.into());
    }
    Ok(())
}

// Event emitted when a swap occurs for two base currencies on two different
// markets (quoted in the same token).
#[event]
pub struct DidSwap {
    // User given (max) amount to swap.
    pub given_amount: u64,
    // The minimum amount of the *to* token expected to be received from
    // executing the swap.
    pub min_expected_swap_amount: u64,
    // Amount of the `from` token sold.
    pub from_amount: u64,
    // Amount of the `to` token purchased.
    pub to_amount: u64,
    // Amount of the quote currency accumulated from the swap.
    pub spill_amount: u64,
    // Mint sold.
    pub from_mint: Pubkey,
    // Mint purchased.
    pub to_mint: Pubkey,
    // Mint of the token used as the quote currency in the two markets used
    // for swapping.
    pub quote_mint: Pubkey,
    // User that signed the transaction.
    pub authority: Pubkey,
}

#[error]
pub enum ErrorCode {
    #[msg("The tokens being swapped must have different mints")]
    SwapTokensCannotMatch,
    #[msg("Slippage tolerance exceeded")]
    SlippageExceeded,
}
