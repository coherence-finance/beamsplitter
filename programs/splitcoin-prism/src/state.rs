use anchor_lang::prelude::*;

use crate::asset_data::AssetData;

// TODO use constant generics here. Not doing it now because
// having a problem with IDL generation right now look into
#[constant]
//const NUM_ASSETS: usize = 256;

/// Contains the info of the prism token. Immutable.
#[account]
#[derive(Debug)]
pub struct PrismToken {
    /// Authority that has admin rights over the [PrismToken].
    pub authority: Pubkey,
    /// Bump seed. Stored for find_program_address on-chain performance
    pub bump: u8,
    /// [Mint] of the [PrismToken]
    pub mint: Pubkey,
    /// [AssetData] array
    pub assets: [AssetData; 2],
}

impl Default for PrismToken {
    #[inline(never)]
    fn default() -> PrismToken {
        PrismToken { authority: Default::default(), bump: Default::default(), mint: Default::default(), assets: [AssetData::default(); 2] }
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
