use anchor_lang::prelude::*;

use crate::asset_data::AssetData;

// TODO use constant generics here. Not doing it now because
// having a problem with IDL generation right now look into

/// Contains the info of the prism token. Immutable.
#[account]
#[derive(Debug)]
pub struct PrismAsset {
    /// Authority that has admin rights over the [PrismAsset].
    pub authority: Pubkey,
    /// Bump seed. Stored for find_program_address on-chain performance
    pub bump: u8,
    /// [Mint] of the [PrismAsset]
    pub mint: Pubkey,
    /// [AssetData] array
    pub assets: [AssetData; 16384]
}

impl Default for PrismAsset {
    fn default() -> PrismAsset {
        PrismAsset { authority: Default::default(), bump: Default::default(), mint: Default::default(), assets: [AssetData::default(); 16384] }
    }
}

#[account]
#[derive(Copy, Debug, Default, PartialEq, Eq)]
pub struct Prism {
    /// Owner of Prism program
    pub owner: Pubkey,
    /// Bump seed. Stored for find_program_address on-chain performance
    pub bump: u8,
}