use crate::asset_data::{AssetData, ReadablePrice};
use anchor_lang::prelude::{AccountInfo, Pubkey};
use serum_dex::critbit::Slab;
use serum_dex::state::MarketState;

// TODO replace 8 with shared max size
/// Helper function that returns Prism token's value
pub fn token_value(asset_data: &[AssetData; 8]) -> i64 {
    let mut sum: i64 = 0;
    asset_data.iter().for_each(|asset| {
        sum += asset.data_feed.get_price().price * asset.weight;
    });
    sum
}

pub fn load_market(market_account: &AccountInfo, dex_pid: Pubkey) -> MarketState {
    MarketState::load(market_account, &dex_pid)?
}

pub fn load_bids(
    market_account: &AccountInfo,
    bids_account: &AccountInfo,
    dex_pid: Pubkey,
) -> &Slab {
    let market = load_market(market_account, dex_pid);
    market.load_bids_mut(bids_account)?
}

pub fn get_slab_price(bids: &Slab) -> u64 {
    for node in bids.nodes().iter() {
        match node.as_leaf() {
            Some(leaf) => {
                return leaf.price().get();
            }
            _ => {}
        }
    }

    return 0;
}

pub fn get_dex_price(
    market_account: &AccountInfo,
    bids_account: &AccountInfo,
    dex_pid: Pubkey,
) -> u64 {
    let bids = load_bids(market_account, bids_account, dex_pid);
    get_slab_price(bids)
}
