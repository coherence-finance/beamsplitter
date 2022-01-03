use anchor_lang::prelude::*;

/// Contains the info of the prism token. Immutable.
#[account]
#[derive(Copy, Debug, Default, PartialEq, Eq)]
pub struct SplitcoinPrism {
    /// Authority that has admin rights over the [SplitcoinPrism].
    pub authority: Pubkey,
    /// Bump seed.
    pub bump: u8,
    /// [Mint] of the [SplitcoinPrism]
    pub mint: Pubkey,
}
