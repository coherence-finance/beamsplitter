use std::cmp;

use crate::asset_source::*;
use serum_dex::critbit::Slab;

// TODO replace 8 with shared max size
/// Helper function that returns Prism token's value
pub fn token_value(asset_sources: &[AssetSource]) -> i64 {
    let mut sum: i64 = 0;
    asset_sources.iter().for_each(|asset| {
        sum += asset.data_source.get_price().price * asset.weight;
    });
    sum
}

pub fn get_slab_price(bids: &Slab) -> u64 {
    let mut highest_bid: u64 = 0;

    for node in bids.nodes().iter() {
        match node.as_leaf() {
            None => {}
            Some(leaf_node) => {
                highest_bid = cmp::max(highest_bid, leaf_node.price().get());
            }
        }
    }

    return highest_bid;
}
