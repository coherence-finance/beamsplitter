use anchor_lang::prelude::*;

use crate::asset_data::{AssetData, Feed};

/// Contains the info of the prism token. Immutable.
#[account]
#[derive(Debug)]
pub struct PrismToken {
    /// The Beamsplitter metadata account associated with this prism token
    pub prism: Pubkey,
    /// Authority that has admin rights over the [PrismToken].
    pub authority: Pubkey,
    /// Bump seed. Stored for find_program_address on-chain performance
    pub bump: u8,
    /// [Mint] of the [PrismToken]
    pub mint: Pubkey,
    // TODO: replace 8 with shared max size
    // TODO: find way to have optional serialization
    /// [AssetData] array
    pub assets: [AssetData; 8],
}

impl Default for PrismToken {
    #[inline(never)]
    fn default() -> PrismToken {
        // TODO replace 8 with shared max size
        PrismToken {
            prism: Pubkey::default(),
            authority: Pubkey::default(),
            bump: u8::default(),
            mint: Pubkey::default(),
            assets: [AssetData {
                data_feed: Feed::Constant { price: 0, expo: 0 },
                weight: 0,
            }; 8],
        }
    }
}

#[account]
#[derive(Copy, Debug, Default)]
pub struct Prism {
    /// Owner of Prism program
    pub owner: Pubkey,
    /// Bump seed. Stored for find_program_address on-chain performance
    pub bump: u8,
}
