use std::mem::size_of;

use anchor_lang::prelude::*;

use crate::enums::*;

#[constant]
pub const _PRISM_ETF_SIZE: usize = size_of::<PrismEtf>();
#[constant]
pub const MAX_WEIGHTED_TOKENS: usize = 100;

/// Contains the info of the prism etf.
#[account]
#[derive(Copy, Debug, Default)]
pub struct PrismEtf {
    /// Manager that has reblancing / closing rights over the [PrismEtf].
    pub manager: Pubkey,
    /// The account containing the [WeightedTokens] of this [PrismEtf]
    pub weighted_tokens: Pubkey,
    /// If true, the ETF can no longer have assets added to it (without rebalancing)
    pub status: PrismEtfStatus,
    /// The bump for this PDA account
    pub bump: u8,
    /// The referrer of this Prism ETF
    pub referer: Pubkey,
    /// How many shared order states have been intialized for this ETF
    pub total_shared_order_states: u16,
    /// Basis points used for construction fee
    pub construction_bps: u16,
    /// Basis points used for deconstruction fee
    pub deconstruction_bps: u16,
    /// Basis points used for manager's cut
    pub manager_cut: u16,
    /// Basis points used for recurring management fee
    pub manager_fee: u16,
    /// Rebalancing option dictates the managers ability to rebalance the account
    pub rebalancing_mode: RebalancingMode,
    /// How often the autorebalancer runs
    pub autorebalancing_schedule: AutorebalancingSchedule,
    /// How often the manager collects fee
    pub manager_schedule: ManagerSchedule,
}

#[repr(packed)]
#[account(zero_copy)]
#[derive(Debug)]
pub struct WeightedTokens {
    /// The index of array
    pub length: u16,
    /// Max capacity of the array
    pub capacity: u16,
    /// [WeightedToken] array
    pub weighted_tokens: [WeightedToken; 100], // TODO find better name
}

/// Contains the info of the prism etf.
#[account]
#[derive(Copy, Debug, Default)]
pub struct OrderState {
    /// Used as additional bump in PDA seeds
    pub id: u16,
    /// The current orderer using this shared_orderer_state
    pub orderer: Pubkey,
    /// After this epoch time (s) this shared_order_state may be used by another orderer
    pub timeout: u64,
    /// [WeightedToken] array
    pub transferred_tokens: Pubkey,
    /// If true, the order is CONSTRUCTION type, otherwise DECONSTRUCTION
    pub order_type: OrderType, // TODO use enum
    /// If true, the order is PENDING (you cannot call start_order and vice versa)
    pub status: OrderStatus, // TODO use enum
    // The amount being CONSTRUCTed or DECONSTRUCTed
    pub amount: u64,
    /// The bump for this PDA account
    pub bump: u8,
}

#[account(zero_copy)]
#[derive(Debug)]
pub struct TransferredTokens {
    /// The index of array
    pub length: u16,
    /// Max capacity of the array
    pub capacity: u16,
    /// Each bool is true if the corresponding weight_token was transferred succesfully in the order
    pub transferred_tokens: [bool; 100], // TODO find better name
}

#[zero_copy]
#[derive(Debug, Default, AnchorDeserialize, AnchorSerialize)]
pub struct WeightedToken {
    pub mint: Pubkey,
    pub weight: u64,
}

#[account]
#[derive(Copy, Debug, Default)]
pub struct Beamsplitter {
    /// Owner of Beamsplitter program
    pub owner: Pubkey,
    /// Bump seed. Stored for find_program_address on-chain performance
    pub bump: u8,
    /// Default basis points used for construction fee
    pub default_construction_bps: u16,
    /// Default basis points used for deconstruction fee
    pub default_deconstruction_bps: u16,
    /// Default basis points used for manager's cut
    pub default_manager_cut: u16,
    /// Default basis points used for manager's recurring fee
    pub default_manager_fee: u16,
    /// The cut for referrer + referree
    pub referral_cut: u16,
    /// The number of slots that orders may pend for before ownership can be stolen
    pub timeout_slots: u16,
    /// The account with rights to autorebalance prism etfs with non NEVER schedule
    pub autorebalancer: Pubkey,
}
