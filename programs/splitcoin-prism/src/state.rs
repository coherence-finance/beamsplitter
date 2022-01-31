use anchor_lang::prelude::*;

use crate::asset_data::AssetData;

/// Contains the info of the prism token. Immutable.
#[account]
#[derive(Debug, Default)]
pub struct PrismAsset {
    /// Authority that has admin rights over the [PrismAsset].
    pub authority: Pubkey,
    /// Bump seed. Stored for find_program_address on-chain performance
    pub bump: u8,
    /// [Mint] of the [PrismAsset]
    pub mint: Pubkey,
    /// [AssetData] array
    pub assets: [AssetData; 32]
}


#[account]
#[derive(Copy, Debug, Default, PartialEq, Eq)]
pub struct Prism {
    /// Owner of Prism program
    pub owner: Pubkey,
    /// Bump seed. Stored for find_program_address on-chain performance
    pub bump: u8,
}