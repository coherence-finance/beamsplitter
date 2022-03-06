use std::mem::size_of;

use anchor_lang::prelude::*;

#[constant]
pub const _PRISM_ETF_SIZE: usize = size_of::<PrismEtf>();
#[constant]
pub const MAX_WEIGHTED_TOKENS: usize = 16384;

/// Contains the info of the prism etf.
#[account]
#[derive(Copy, Debug, Default)]
pub struct PrismEtf {
    /// Manager that has reblancing / closing rights over the [PrismEtf].
    pub manager: Pubkey,
    /// The account containing the [WeightedTokens] of this [PrismEtf]
    pub weighted_tokens: Pubkey,
    /// If true, the ETF can no longer have assets added to it (without rebalancing)
    pub is_finished: bool,
    /// The bump for this PDA account
    pub bump: u8,
}

#[account(zero_copy)]
#[derive(Debug)]
pub struct WeightedTokens {
    /// The index of array
    pub index: u32,
    /// Max capacity of the array
    pub capacity: u32,
    /// [WeightedToken] array
    pub weighted_tokens: [WeightedToken; 16384], // TODO find better name
}

/// Contains the info of the prism etf.
#[account]
#[derive(Copy, Debug, Default)]
pub struct OrderState {
    /// [WeightedToken] array
    pub transfered_tokens: Pubkey,
    /// If true, the order is CONSTRUCTION type, otherwise DECONSTRUCTION
    pub is_construction: bool, // TODO use enum
    /// If true, the order is PENDING (you cannot call start_order and vice versa)
    pub is_pending: bool, // TODO use enum
    // The amount being CONSTRUCTed or DECONSTRUCTed
    pub amount: u64,
    // The decimals for the amount
    pub dec: u8,
    /// The bump for this PDA account
    pub bump: u8,
}

#[account(zero_copy)]
#[derive(Debug)]
pub struct TransferredTokens {
    /// The index of array
    pub index: u32,
    /// Max capacity of the array
    pub capacity: u32,
    /// Each bool is true if the corresponding weight_token was transferred succesfully in the order
    pub transferred_tokens: [bool; 16384], // TODO find better name
}

#[zero_copy]
#[derive(Debug, Default, AnchorDeserialize, AnchorSerialize)]
pub struct WeightedToken {
    pub mint: Pubkey,
    pub weight: u32,
    pub dec: u8,
}

#[account]
#[derive(Copy, Debug, Default)]
pub struct Beamsplitter {
    /// Owner of Beamsplitter program
    pub owner: Pubkey,
    /// Bump seed. Stored for find_program_address on-chain performance
    pub bump: u8,
}
