use std::cmp;

use anchor_lang::prelude::ProgramError;
use serum_dex::critbit::Slab;

// TODO replace 8 with shared max size
/// Helper function that returns Prism etf's value
/*pub fn token_value(asset_source: &[AssetSource; 8]) -> i64 {
    let mut sum: i64 = 0;
    asset_source.iter().for_each(|asset| {
        sum += asset.data_source.get_price().price * asset.weight;
    });
    sum
}*/

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
