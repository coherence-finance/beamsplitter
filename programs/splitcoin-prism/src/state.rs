use anchor_lang::prelude::*;

/// Contains the info of the prism token. Immutable.
#[account]
#[derive(Copy, Debug, Default, PartialEq, Eq)]
pub struct PrismAsset {
    /// Authority that has admin rights over the [PrismAsset].
    pub authority: Pubkey,
    /// Bump seed. Stored for find_program_address on-chain performance
    pub bump: u8,
    /// [Mint] of the [PrismAsset]
    pub mint: Pubkey,
}
