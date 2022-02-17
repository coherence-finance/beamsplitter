use anchor_lang::prelude::*;

/// Contains the info of the prism etf. Immutable.
#[account(zero_copy)]
#[derive(Debug)]
pub struct PrismEtf {
    // TODO: replace 8 with shared max size
    // TODO: find way to have optional serialization
    /// [WeightedToken] array
    pub weighted_tokens: [WeightedToken; 16384],

    /// The Beamsplitter metadata account associated with this prism etf
    pub prism_etf: Pubkey,
    /// Authority that has admin rights over the [PrismEtf].
    pub authority: Pubkey,

    /// [Mint] of the [PrismEtf]
    pub mint: Pubkey,
    /// Bump seed. Stored for find_program_address on-chain performance

    /// The index of weighted_tokens array
    pub index: u32,
    pub bump: u8,
}

#[zero_copy]
#[derive(Debug, Default, AnchorDeserialize, AnchorSerialize)]
pub struct WeightedToken {
    pub mint: Pubkey,
    pub weight: u32,
}

#[account]
#[derive(Copy, Debug, Default)]
pub struct Beamsplitter {
    /// Owner of Beamsplitter program
    pub owner: Pubkey,
    /// Bump seed. Stored for find_program_address on-chain performance
    pub bump: u8,
}

#[account]
#[derive(Copy, Debug, Default)]
pub struct PriceConfig {
    pub price: u64,
}
