use anchor_lang::prelude::*;

use crate::asset_source::{AssetSource, Source};

/// Contains the info of the prism etf. Immutable.
#[account]
#[derive(Debug)]
pub struct PrismEtf {
    /// The Beamsplitter metadata account associated with this prism etf
    pub prism_etf: Pubkey,
    /// Authority that has admin rights over the [PrismEtf].
    pub authority: Pubkey,
    /// Bump seed. Stored for find_program_address on-chain performance
    pub bump: u8,
    /// [Mint] of the [PrismEtf]
    pub mint: Pubkey,
    // TODO: replace 8 with shared max size
    // TODO: find way to have optional serialization
    /// [AssetSource] array
    pub assets: [AssetSource; 8],
}

impl Default for PrismEtf {
    #[inline(never)]
    fn default() -> PrismEtf {
        // TODO replace 8 with shared max size
        PrismEtf {
            prism_etf: Pubkey::default(),
            authority: Pubkey::default(),
            bump: u8::default(),
            mint: Pubkey::default(),
            assets: [AssetSource {
                data_source: Source::Constant { price: 0, expo: 0 },
                weight: 0,
            }; 8],
        }
    }
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
