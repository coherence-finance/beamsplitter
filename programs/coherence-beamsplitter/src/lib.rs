//pub mod anchor_swap;
pub mod context;
pub mod errors;
pub mod state;
pub mod util;

use anchor_lang::prelude::*;
use anchor_spl::token;
use context::*;
use errors::BeamsplitterErrors;
use state::*;

declare_id!("4WWKCwKfhz7cVkd4sANskBk3y2aG9XpZ3fGSQcW1yTBB");

#[program]
pub mod coherence_beamsplitter {
    use std::ps::MulAssign;

    use anchor_spl::token::{accessor::authority, burn, mint_to, transfer, Burn, MintTo, Transfer};

    use rust_decimal::{
        prelude::{ToPrimitive, Zero},
        Decimal,
    };
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

    pub fn init_weighted_tokens(ctx: Context<InitWeightedTokens>) -> ProgramResult {
        let weighted_tokens = &mut ctx.accounts.weighted_tokens.load_init()?;
        weighted_tokens.capacity = state::MAX_WEIGHTED_TOKENS as u32;
        Ok(())
    }

    pub fn init_transferred_tokens(ctx: Context<InitTransferredTokens>) -> ProgramResult {
        let transferred_tokens = &mut ctx.accounts.transferred_tokens.load_init()?;
        transferred_tokens.capacity = state::MAX_WEIGHTED_TOKENS as u32;
        Ok(())
    }

    pub fn init_prism_etf(ctx: Context<InitPrismEtf>, bump: u8) -> ProgramResult {
        let prism_etf = &mut ctx.accounts.prism_etf;
        let beamsplitter = &ctx.accounts.beamsplitter;
        let weighted_tokens = &ctx.accounts.weighted_tokens;
        let mint = &ctx.accounts.prism_etf_mint;
        let manager = &ctx.accounts.manager;

        prism_etf.manager = manager.key();
        prism_etf.bump = bump;
        prism_etf.weighted_tokens = weighted_tokens.key();
        prism_etf.is_finished = false;

        // If Beamsplitter does not have authority over token and signer of TX is not Beamsplitter owner
        if beamsplitter.owner != authority(&mint.to_account_info())?
            && manager.key() != beamsplitter.owner
        {
            return Err(BeamsplitterErrors::NotMintAuthority.into());
        }

        Ok(())
    }

    /// Push weighted tokens into an ETF
    pub fn push_tokens(ctx: Context<PushTokens>, new_tokens: Vec<WeightedToken>) -> ProgramResult {
        let prism_etf = &ctx.accounts.prism_etf;
        let weighted_tokens = &mut ctx.accounts.weighted_tokens.load_mut()?;

        if prism_etf.is_finished == true {
            return Err(BeamsplitterErrors::IsFinished.into());
        }

        for (idx, weighted_token) in new_tokens.iter().enumerate() {
            if weighted_tokens.index >= weighted_tokens.capacity {
                return Err(BeamsplitterErrors::ETFFull.into());
            }
            let etf_idx = weighted_tokens.index as usize;
            weighted_tokens.weighted_tokens[idx + etf_idx] = weighted_token.clone();
        }

        weighted_tokens.index += 1;

        Ok(())
    }

    pub fn init_order_state(ctx: Context<InitOrderState>, bump: u8) -> ProgramResult {
        let order_state = &mut ctx.accounts.order_state;
        order_state.bump = bump;
        order_state.transfered_tokens = ctx.accounts.transferred_tokens.key();
        order_state.is_pending = false;
        Ok(())
    }

    /*
    Initalize a new Prism ETF CONSTRUCTION or DECONSTRUCTION order

    Failure cases:
    - prism_etf.weighted_tokens_at != weighted_tokens.key()
    - order_state.status = PENDING
    - prism_etf is not owned by Beamsplitter
    - order_state is not owned by Beamsplitter
    - the amount of etf tokens being constructed or deconstructed is invalid

    Flow:
    1. Set order_state.status = PENDING
    2. Set order_state.type = <order_type>
    3. if order_state.type == DECONSTRUCTION, burn <amount> of tokens
    */
    pub fn start_order(ctx: Context<StartOrder>, order_type: bool, amount: u64) -> ProgramResult {
        let order_state = &mut ctx.accounts.order_state;

        if order_state.is_pending {
            return Err(ProgramError::InvalidArgument.into());
        }

        order_state.amount = amount;
        order_state.is_construction = order_type;
        order_state.is_pending = true;

        let weighted_tokens = &ctx.accounts.weighted_tokens.load()?;
        let transferred_tokens = &mut ctx.accounts.transferred_tokens.load_mut()?;
        transferred_tokens.index = weighted_tokens.index;

        if !order_state.is_construction {
            let mint_accounts = Burn {
                mint: ctx.accounts.prism_etf_mint.to_account_info(),
                to: ctx.accounts.orderer_etf_ata.to_account_info(),
                authority: ctx.accounts.beamsplitter.to_account_info(),
            };

            let seeds = &[PDA_SEED, &[ctx.accounts.beamsplitter.bump]];
            let signer_seeds = &[&seeds[..]];

            let burn_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                mint_accounts,
                signer_seeds,
            );

            let burn_amount = amount.to_u64().ok_or(ProgramError::InvalidArgument)?;

            burn(burn_ctx, burn_amount)?;
        }

        Ok(())
    }

    /*
    Cohere an asset to the etf being built. Used in CONSTRUCTION orders

    Failure cases:
    - prism_etf.weighted_tokens_at != weighted_tokens.key()
    - order_state.type = DECONSTRUCTION
    - order_state.status = CANCELLED || SUCCEEDED
    - prism_etf is not owned by Beamsplitter
    - order_state is not owned by Beamsplitter
    - the amount delegated is below required amount for the etf tokens being created

    Flow:
    1. Transfer amount of required tokens to Beamspltitter from user ata accounts
    */
    pub fn cohere(ctx: Context<Cohere>, index: usize) -> ProgramResult {
        let order_state = &mut ctx.accounts.order_state;

        if !order_state.is_pending {
            return Err(ProgramError::InvalidArgument.into());
        }

        if !order_state.is_construction {
            return Err(ProgramError::InvalidArgument.into());
        }

        let weighted_tokens = &ctx.accounts.weighted_tokens.load()?;
        let transferred_tokens = &mut ctx.accounts.transferred_tokens.load_mut()?;

        // The index passed must correspond to the
        if weighted_tokens.weighted_tokens[index].mint != ctx.accounts.transfer_mint.key() {
            return Err(ProgramError::InvalidArgument.into());
        }

        // The weighted token of asset being transferred
        let weighted_token = &weighted_tokens.weighted_tokens[index];
        let required_amount = &mut Decimal::from(order_state.amount);

        let delegated_amount = ctx.accounts.orderer_transfer_ata.delegated_amount;
        let amount = &Decimal::from(delegated_amount);
        let weight = &mut Decimal::from(weighted_token.weight);

        // Scales the weight by how many decimals it uses (eg Dec = 1 for value 10 == 1.0)
        match weight.set_scale(weighted_token.dec as u32) {
            Err(_error) => return Err(ProgramError::InvalidArgument.into()),
            _ => (),
        }

        required_amount.mul_assign(*weight);

        if amount < required_amount {
            return Err(ProgramError::InvalidArgument.into());
        }

        let transfer_accounts = Transfer {
            to: ctx.accounts.beamsplitter_transfer_ata.to_account_info(),
            authority: ctx.accounts.transfer_authority.to_account_info(),
            from: ctx.accounts.orderer_transfer_ata.to_account_info(),
        };

        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            transfer_accounts,
        );

        // Mark this token as successfully transferred
        transferred_tokens.transferred_tokens[index] = true;

        transfer(transfer_ctx, order_state.amount)?;

        Ok(())
    }

    /*
    Decohere an asset from the etf being built. Used in CONSTRUCTION orders

    Failure cases:
    - prism_etf.weighted_tokens_at != weighted_tokens.key()
    - order_state.type = CONSTRUCTION
    - order_state.status = CANCELLED || SUCCEEDED
    - prism_etf is not owned by Beamsplitter
    - order_state is not owned by Beamsplitter
    - the amount delegated is below required amount for the etf tokens being created

    Flow:
    1. Transfer tokens from beamsplitter to user
    */
    /*pub fn decohere(ctx: Context<Decohere>) -> ProgramResult {
        let prism_etf = &ctx.accounts.prism_etf.load()?;

        // COND: Validate order type

        // Get's amount approved to buy

        Ok(())
    }*/

    /*
    Finalize a Prism ETF CONSTRUCTION or DECONSTRUCTION order

    Failure cases:
    - prism_etf.weighted_tokens_at != weighted_tokens.key()
    - order_state.status = CANCELLED || SUCCEEDED (at instruction start)
    - prism_etf is not owned by Beamsplitter
    - order_state is not owned by Beamsplitter
    - the amount of etf tokens being constructed or deconstructed is invalid

    Flow:
    1. Set order_state.status = SUCCEEDED
    2. if order_state.type == CONSTRUCTION, mint order_state.amount of tokens
    */
    /*pub fn finalize_order<'info>(ctx: Context<FinalizeOrder>) -> ProgramResult {
        let prism_etf = &ctx.accounts.prism_etf.load()?;

        // Get's amount approved to buy

        Ok(())
    }*/

    // MINT CODE
    /*{
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

        let mint_amount = portion_amount
            .to_u64()
            .ok_or(ProgramError::InvalidArgument)?;

        mint_to(mint_to_ctx, mint_amount)?;
    }*/

    // TODO: Factor in decimals into price
    /*pub fn get_price(ctx: Context<GetPrice>, dex_pid: Pubkey) -> ProgramResult {
        let price_account = &mut ctx.accounts.price;

        price_account.price = get_slab_price(&bids)?;

        Ok(())
    }*/
}
