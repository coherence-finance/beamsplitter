use crate::asset_source::*;
use anchor_lang::prelude::{AccountInfo, ProgramError, Pubkey};
use serum_dex::critbit::Slab;
use serum_dex::state::MarketState;
use std::cmp;

// TODO replace 8 with shared max size
/// Helper function that returns Prism token's value
pub fn token_value(asset_sources: &[AssetSource]) -> Result<i64, ProgramError> {
    let mut sum: i64 = 0;
    asset_sources.iter().for_each(|asset| {
        sum += asset.data_source.get_price().price * asset.weight;
    });
    Ok(sum)
}

pub fn get_slab_price(bids: &Slab) -> Result<u64, ProgramError> {
    let mut highest_bid: u64 = 0;

    for node in bids.nodes().iter() {
        match node.as_leaf() {
            None => {}
            Some(leaf_node) => {
                highest_bid = cmp::max(highest_bid, leaf_node.price().get());
            }
        }
    }

    return Ok(highest_bid);
}

pub fn update_feeds(
    asset_source: &[AssetSource],
    accts: &[AccountInfo],
    dex_pid: Pubkey,
) -> Result<(), ProgramError> {
    // There should be at least one pair of a bid and market account
    if asset_source.len() * 2 <= accts.len() {
        return Err(ProgramError::InvalidArgument);
    }

    // Assumes market, bid accounts are ordered same as source accounts
    /*for (idx, asset) in asset_source.iter().enumerate() {
        let source = &asset.data_source;
        match source {
            Source::Dex {
                mut last_price,
                expo: _,
                market_account: _,
            } => {
                let market_acct = &accts[idx * 2];
                let bid_acct = &accts[idx * 2 + 1];

                let market = MarketState::load(market_acct, &dex_pid, false)?;
                let bids = market.load_bids_mut(bid_acct)?;

                last_price = get_slab_price(&bids)?;
                return Ok(());
            }
            _ => return Ok(()),
        }
    }*/
    Ok(())
}
