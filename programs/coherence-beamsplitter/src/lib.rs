#![allow(unaligned_references)]
pub mod context;
pub mod enums;
pub mod errors;
pub mod state;

use anchor_lang::prelude::*;
use context::*;
use enums::*;
use errors::BeamsplitterErrors;
use state::*;

declare_id!("HoFBL9J5kp655xmXhg48riQRqeuqtST1goEdwmexkz3");

// The default share of transferred assets split between beamsplitter and manager (0.45% for each way)
#[constant]
const DEFAULT_CONSTRUCT_BPS: u16 = 90;
#[constant]
const DEFAULT_DECONSTRUCT_BPS: u16 = 0;

// The default share of each fee given to managers of etf (20%)
#[constant]
const DEFAULT_MANAGER_BPS: u16 = 2_000;

// BPS (standard basis point decimals)
#[constant]
const BASIS_POINT_DECIMALS: u8 = 4;

#[program]
pub mod coherence_beamsplitter {
    use std::{
        mem::size_of,
        ops::{Mul, MulAssign, SubAssign},
    };

    use anchor_spl::token::{burn, mint_to, transfer, Burn, MintTo, Transfer};

    use rust_decimal::{prelude::ToPrimitive, Decimal};
    const PDA_SEED: &[u8] = b"Beamsplitter" as &[u8];

    use super::*;

    /// Initializes the Beamsplitter program state
    pub fn initialize(ctx: Context<Initialize>, bump: u8) -> ProgramResult {
        let beamsplitter = &mut ctx.accounts.beamsplitter;

        **beamsplitter = Beamsplitter {
            owner: ctx.accounts.owner.key(),
            bump,
            default_construction_bps: DEFAULT_CONSTRUCT_BPS,
            default_deconstruction_bps: DEFAULT_DECONSTRUCT_BPS,
            default_manager_cut: DEFAULT_MANAGER_BPS,
            default_manager_fee: 0,
            autorebalancer: ctx.accounts.owner.key(),
        };

        Ok(())
    }

    pub fn init_weighted_tokens(ctx: Context<InitWeightedTokens>) -> ProgramResult {
        msg![
            "weighted tokens (without discriminator) is {} bytes",
            &size_of::<WeightedTokens>().to_string()[..]
        ];
        let weighted_tokens = &mut ctx.accounts.weighted_tokens.load_init()?;
        weighted_tokens.capacity = state::MAX_WEIGHTED_TOKENS as u16;
        Ok(())
    }

    pub fn init_transferred_tokens(ctx: Context<InitTransferredTokens>) -> ProgramResult {
        msg![
            "transferred tokens (without discriminator) is {} bytes",
            &size_of::<TransferredTokens>().to_string()[..]
        ];
        let transferred_tokens = &mut ctx.accounts.transferred_tokens.load_init()?;
        transferred_tokens.capacity = state::MAX_WEIGHTED_TOKENS as u16;
        Ok(())
    }

    pub fn init_prism_etf(ctx: Context<InitPrismEtf>, bump: u8) -> ProgramResult {
        let prism_etf = &mut ctx.accounts.prism_etf;
        let beamsplitter = &ctx.accounts.beamsplitter;
        let weighted_tokens = &ctx.accounts.weighted_tokens;
        let mint = &ctx.accounts.prism_etf_mint;
        let manager = &ctx.accounts.manager;

        **prism_etf = PrismEtf {
            manager: manager.key(),
            weighted_tokens: weighted_tokens.key(),
            status: PrismEtfStatus::UNFINISHED,
            bump,
            total_shared_order_states: 0,
            construction_bps: beamsplitter.default_construction_bps,
            deconstruction_bps: beamsplitter.default_deconstruction_bps,
            manager_cut: beamsplitter.default_manager_cut,
            manager_fee: beamsplitter.default_manager_fee,
            rebalancing_mode: RebalancingMode::OFF,
            autorebalancing_schedule: AutorebalancingSchedule::NEVER,
            manager_schedule: ManagerSchedule::NEVER,
        };

        if beamsplitter.key() != mint.mint_authority.unwrap() {
            return Err(BeamsplitterErrors::NotMintAuthority.into());
        }

        // If freeze authority exists and it's not Beamsplitter
        if beamsplitter.key() != mint.freeze_authority.unwrap_or(beamsplitter.key()) {
            return Err(BeamsplitterErrors::NotFreezeAuthority.into());
        }

        if mint.supply != 0 {
            return Err(BeamsplitterErrors::NonZeroSupply.into());
        }

        Ok(())
    }

    pub fn finalize_prism_etf(ctx: Context<FinalizePrismEtf>) -> ProgramResult {
        let prism_etf = &mut ctx.accounts.prism_etf;
        prism_etf.status = PrismEtfStatus::FINISHED;

        Ok(())
    }

    /// Push weighted tokens into an ETF
    pub fn push_tokens(ctx: Context<PushTokens>, new_tokens: Vec<WeightedToken>) -> ProgramResult {
        let prism_etf = &ctx.accounts.prism_etf;
        let weighted_tokens = &mut ctx.accounts.weighted_tokens.load_mut()?;

        if prism_etf.status != PrismEtfStatus::UNFINISHED {
            return Err(BeamsplitterErrors::IsFinished.into());
        }

        for (idx, weighted_token) in new_tokens.iter().enumerate() {
            if weighted_token.weight <= 0 {
                return Err(BeamsplitterErrors::ZeroWeight.into());
            }
            if weighted_tokens.length >= weighted_tokens.capacity {
                return Err(BeamsplitterErrors::ETFFull.into());
            }
            let etf_idx = weighted_tokens.length as usize;
            weighted_tokens.weighted_tokens[idx + etf_idx] = weighted_token.clone();
        }

        weighted_tokens.length += new_tokens.len() as u16;

        Ok(())
    }

    pub fn init_order_state(ctx: Context<InitOrderState>, bump: u8) -> ProgramResult {
        let order_state = &mut ctx.accounts.order_state;
        order_state.bump = bump;
        order_state.transferred_tokens = ctx.accounts.transferred_tokens.key();
        order_state.status = OrderStatus::SUCCEEDED;
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
    pub fn start_order(
        ctx: Context<StartOrder>,
        order_type: OrderType,
        amount: u64,
    ) -> ProgramResult {
        let order_state = &mut ctx.accounts.order_state;
        let prism_etf = &ctx.accounts.prism_etf;

        if order_state.status == OrderStatus::PENDING {
            return Err(BeamsplitterErrors::IncorrectOrderStatus.into());
        }

        if prism_etf.status != PrismEtfStatus::FINISHED {
            return Err(BeamsplitterErrors::PrismEtfNotFinished.into());
        }

        if amount <= 0 {
            return Err(BeamsplitterErrors::ZeroOrder.into());
        }

        order_state.amount = amount;
        order_state.order_type = order_type;
        order_state.status = OrderStatus::PENDING;

        let weighted_tokens = &ctx.accounts.weighted_tokens.load()?;
        let transferred_tokens = &mut ctx.accounts.transferred_tokens.load_mut()?;
        transferred_tokens.length = weighted_tokens.length;

        let transferred_tokens_length = transferred_tokens.length as usize;
        if order_state.order_type == OrderType::CONSTRUCTION {
            // Set all all switches to NOT transferred
            for transferred_token in
                transferred_tokens.transferred_tokens[..transferred_tokens_length].iter_mut()
            {
                *transferred_token = false;
            }
            // We can exit here, burning not required for CONSTRUCT
            return Ok(());
        } else {
            // Set all all switches to transferred
            for transferred_token in
                transferred_tokens.transferred_tokens[..transferred_tokens_length].iter_mut()
            {
                *transferred_token = true;
            }
        }

        let mint_accounts = Burn {
            mint: ctx.accounts.prism_etf_mint.to_account_info(),
            to: ctx.accounts.orderer_etf_ata.to_account_info(),
            authority: ctx.accounts.orderer.to_account_info(),
        };

        let seeds = &[PDA_SEED, &[ctx.accounts.beamsplitter.bump]];
        let signer_seeds = &[&seeds[..]];

        let burn_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            mint_accounts,
            signer_seeds,
        );

        let burn_amount = amount.to_u64().ok_or(BeamsplitterErrors::U64Failure)?;

        burn(burn_ctx, burn_amount)?;
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
    pub fn cohere(ctx: Context<Cohere>, index: u16) -> ProgramResult {
        let order_state = &mut ctx.accounts.order_state;
        let index_usize = index as usize;

        if order_state.status != OrderStatus::PENDING {
            return Err(BeamsplitterErrors::IncorrectOrderStatus.into());
        }

        let weighted_tokens = &ctx.accounts.weighted_tokens.load()?;
        let transferred_tokens = &mut ctx.accounts.transferred_tokens.load_mut()?;

        if transferred_tokens.transferred_tokens[index_usize] {
            return Ok(());
        }

        if index >= weighted_tokens.length {
            return Err(BeamsplitterErrors::IndexPassedBound.into());
        }

        // The index passed must correspond to the transfer_mint
        if weighted_tokens.weighted_tokens[index_usize].mint != ctx.accounts.transfer_mint.key() {
            return Err(BeamsplitterErrors::WrongIndexMint.into());
        }

        // The weighted token of asset being transferred
        let weighted_token = &weighted_tokens.weighted_tokens[index_usize];
        let required_amount = &mut Decimal::from(order_state.amount);

        let delegated_amount = ctx.accounts.orderer_transfer_ata.delegated_amount;
        let amount = &Decimal::from(delegated_amount);
        let weight = &mut Decimal::from(weighted_token.weight);

        let prism_etf_decimals = ctx.accounts.prism_etf_mint.decimals;

        required_amount.mul_assign(*weight);

        // We need to account for the decimals of the input
        match required_amount.set_scale(prism_etf_decimals.into()) {
            Err(_error) => return Err(BeamsplitterErrors::ScaleFailure.into()),
            _ => (),
        }

        if amount < required_amount {
            return Err(BeamsplitterErrors::NotEnoughApproved.into());
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
        transferred_tokens.transferred_tokens[index_usize] = true;

        // Converts to u64, cut's off decimals,
        let mut required_64 = required_amount
            .to_u64()
            .ok_or(BeamsplitterErrors::U64Failure)?;

        // This rounds up to 1 if the value was extremely small (prevent free cohere)
        if required_64 <= 0 {
            required_64 = 1;
        };

        transfer(transfer_ctx, required_64)?;

        Ok(())
    }

    /*
    Decohere an asset from the etf being built. Used in DECONSTRUCTION orders

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
    pub fn decohere(ctx: Context<Cohere>, index: u16) -> ProgramResult {
        let index_usize = index as usize;
        let order_state = &mut ctx.accounts.order_state;

        if order_state.status != OrderStatus::PENDING {
            return Err(BeamsplitterErrors::IncorrectOrderStatus.into());
        }

        let weighted_tokens = &ctx.accounts.weighted_tokens.load()?;
        let transferred_tokens = &mut ctx.accounts.transferred_tokens.load_mut()?;

        // Already decohered
        if !transferred_tokens.transferred_tokens[index_usize] {
            return Ok(());
        }

        if index >= weighted_tokens.length {
            return Err(BeamsplitterErrors::IndexPassedBound.into());
        }

        if weighted_tokens.weighted_tokens[index_usize].mint != ctx.accounts.transfer_mint.key() {
            return Err(BeamsplitterErrors::WrongIndexMint.into());
        }

        let transfer_accounts = Transfer {
            to: ctx.accounts.orderer_transfer_ata.to_account_info(),
            authority: ctx.accounts.transfer_authority.to_account_info(),
            from: ctx.accounts.beamsplitter_transfer_ata.to_account_info(),
        };

        let seeds = &[PDA_SEED, &[ctx.accounts.beamsplitter.bump]];
        let signer_seeds = &[&seeds[..]];

        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            transfer_accounts,
            signer_seeds,
        );

        // Mark this token as successfully transferred
        transferred_tokens.transferred_tokens[index_usize] = false;

        let weighted_token = &weighted_tokens.weighted_tokens[index_usize];
        let required_amount = &mut Decimal::from(order_state.amount);
        let weight = &mut Decimal::from(weighted_token.weight);
        let prism_etf_decimals = ctx.accounts.prism_etf_mint.decimals;

        required_amount.mul_assign(*weight);

        // We need to account for the decimals of the input
        match required_amount.set_scale(prism_etf_decimals.into()) {
            Err(_error) => return Err(BeamsplitterErrors::ScaleFailure.into()),
            _ => (),
        }

        transfer(
            transfer_ctx,
            required_amount
                .to_u64()
                .ok_or(BeamsplitterErrors::U64Failure)?,
        )?;

        Ok(())
    }

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
    pub fn finalize_order(ctx: Context<FinalizeOrder>) -> ProgramResult {
        let order_state = &mut ctx.accounts.order_state;

        if order_state.status != OrderStatus::PENDING {
            return Err(ProgramError::InvalidArgument.into());
        }

        let transferred_tokens = &ctx.accounts.transferred_tokens.load()?;
        let transferred_tokens_index = transferred_tokens.length as usize;

        // If all transferred tokens are false (0) than we can finalize knowing all assets were removed (or never added)
        if !transferred_tokens.transferred_tokens[0] {
            for transferred_token in
                transferred_tokens.transferred_tokens[..transferred_tokens_index].iter()
            {
                if *transferred_token {
                    return Err(BeamsplitterErrors::StillPending.into());
                }
            }
            order_state.status = OrderStatus::SUCCEEDED;
            return Ok(());
        }

        // Otherwise we need to make sure all were transferred to Beamsplitter (or were never removed)
        for transferred_token in
            transferred_tokens.transferred_tokens[..transferred_tokens_index].iter()
        {
            if !*transferred_token {
                return Err(BeamsplitterErrors::StillPending.into());
            }
        }

        let amount = order_state.amount;
        let mut mint_amount = Decimal::from(amount);

        // The amount of tokens for manager and program owner
        let mut fee_portion =
            Decimal::from(ctx.accounts.prism_etf.construction_bps).mul(mint_amount);

        // Need to adjust scale after multiplying
        match fee_portion.set_scale(BASIS_POINT_DECIMALS.into()) {
            Err(_error) => return Err(BeamsplitterErrors::ScaleFailure.into()),
            _ => (),
        }

        // Owner gets at least 1 minimum unit of etf
        if fee_portion < Decimal::from(2u8) {
            fee_portion = Decimal::from(2u8);
        }

        // The amount just for manager
        let mut manager_portion =
            Decimal::from(ctx.accounts.prism_etf.manager_cut).mul(fee_portion);

        match manager_portion.set_scale((2 * BASIS_POINT_DECIMALS).into()) {
            Err(_error) => return Err(BeamsplitterErrors::ScaleFailure.into()),
            _ => (),
        }

        // Manager gets at least 1 minimum unit of etf
        if manager_portion < Decimal::from(1u8) {
            fee_portion = Decimal::from(1u8);
        }

        // Subtract out the construction fee from orderer amount
        mint_amount.sub_assign(fee_portion);

        // Subtract out the manager portion from fee portion
        fee_portion.sub_assign(manager_portion);

        // Mint tokens to the orderer
        let mint_accounts_orderer = MintTo {
            mint: ctx.accounts.prism_etf_mint.to_account_info(),
            to: ctx.accounts.orderer_etf_ata.to_account_info(),
            authority: ctx.accounts.beamsplitter.to_account_info(),
        };

        let seeds = &[PDA_SEED, &[ctx.accounts.beamsplitter.bump]];
        let signer_seeds = &[&seeds[..]];

        let mint_ctx_orderer = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            mint_accounts_orderer,
            signer_seeds,
        );

        mint_to(
            mint_ctx_orderer,
            mint_amount.to_u64().ok_or(BeamsplitterErrors::U64Failure)?,
        )?;

        // Mint tokens to Program owner
        let mint_accounts_owner = MintTo {
            mint: ctx.accounts.prism_etf_mint.to_account_info(),
            to: ctx.accounts.owner_etf_ata.to_account_info(),
            authority: ctx.accounts.beamsplitter.to_account_info(),
        };

        let seeds = &[PDA_SEED, &[ctx.accounts.beamsplitter.bump]];
        let signer_seeds = &[&seeds[..]];

        let mint_ctx_owner = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            mint_accounts_owner,
            signer_seeds,
        );

        mint_to(
            mint_ctx_owner,
            fee_portion.to_u64().ok_or(BeamsplitterErrors::U64Failure)?,
        )?;

        // Mint tokens to Manager of ETF
        let mint_accounts_manager = MintTo {
            mint: ctx.accounts.prism_etf_mint.to_account_info(),
            to: ctx.accounts.manager_etf_ata.to_account_info(),
            authority: ctx.accounts.beamsplitter.to_account_info(),
        };

        let seeds = &[PDA_SEED, &[ctx.accounts.beamsplitter.bump]];
        let signer_seeds = &[&seeds[..]];

        let mint_ctx_manager = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            mint_accounts_manager,
            signer_seeds,
        );

        mint_to(
            mint_ctx_manager,
            manager_portion
                .to_u64()
                .ok_or(BeamsplitterErrors::U64Failure)?,
        )?;

        order_state.status = OrderStatus::SUCCEEDED;

        Ok(())
    }

    pub fn close_prism_etf(ctx: Context<ClosePrismEtf>) -> ProgramResult {
        if ctx.accounts.prism_etf_mint.supply != 0 {
            return Err(BeamsplitterErrors::NonZeroSupply.into());
        }
        Ok(())
    }

    pub fn close_order_state(_ctx: Context<ClosePrismEtf>) -> ProgramResult {
        Ok(())
    }

    pub fn set_owner(ctx: Context<SetOwner>) -> ProgramResult {
        ctx.accounts.beamsplitter.owner = ctx.accounts.new_owner.key();
        Ok(())
    }

    pub fn set_default_manager_cut(
        ctx: Context<SetDefaultManagerCut>,
        new_default_manager_cut: u16,
    ) -> ProgramResult {
        ctx.accounts.beamsplitter.default_manager_cut = new_default_manager_cut;
        Ok(())
    }

    pub fn set_default_construction_bps(
        ctx: Context<SetDefaultConstruction>,
        new_construction_bps: u16,
    ) -> ProgramResult {
        ctx.accounts.beamsplitter.default_construction_bps = new_construction_bps;
        Ok(())
    }

    pub fn set_default_deconstruction_bps(
        ctx: Context<SetDefaultDeconstruction>,
        new_deconstruction_bps: u16,
    ) -> ProgramResult {
        ctx.accounts.beamsplitter.default_deconstruction_bps = new_deconstruction_bps;
        Ok(())
    }

    pub fn set_manager(ctx: Context<SetManager>) -> ProgramResult {
        ctx.accounts.prism_etf.manager = ctx.accounts.new_manager.key();
        Ok(())
    }

    pub fn set_manager_cut(
        ctx: Context<SetManagerCut>,
        new_default_manager_cut: u16,
    ) -> ProgramResult {
        ctx.accounts.prism_etf.manager_cut = new_default_manager_cut;
        Ok(())
    }

    pub fn set_construction_bps(
        ctx: Context<SetConstruction>,
        new_construction_bps: u16,
    ) -> ProgramResult {
        ctx.accounts.prism_etf.construction_bps = new_construction_bps;
        Ok(())
    }

    pub fn set_deconstruction_bps(
        ctx: Context<SetDeconstruction>,
        new_deconstruction_bps: u16,
    ) -> ProgramResult {
        ctx.accounts.prism_etf.deconstruction_bps = new_deconstruction_bps;
        Ok(())
    }
}
