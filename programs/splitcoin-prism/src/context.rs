use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::token::Mint;

#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct NewAsset<'info> {
    /// Information about the [PrismAsset].
    #[account(
        init,
        seeds = [
            b"PrismAsset".as_ref(),
            asset_mint.key().to_bytes().as_ref()
        ],
        bump = bump,
        payer = admin_authority,
    )]
    pub prism_asset: Account<'info, PrismAsset>,
    /// Authority that has admin rights over the [PrismAsset].
    pub admin_authority: Signer<'info>,
    /// [Mint] of the [PrismAsset].
    pub asset_mint: Account<'info, Mint>,
    /// The [System] program.
    pub system_program: Program<'info, System>,
}
