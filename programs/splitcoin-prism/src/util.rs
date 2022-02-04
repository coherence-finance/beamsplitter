use crate::{state::PrismToken, asset_data::ReadablePrice};

/// Helper function that returns Prism token's value
pub fn token_value(prism_token: PrismToken) -> i64 {
    let mut sum: i64 = 0;
    prism_token.assets.iter().for_each(|asset| {
        sum += asset.data_feed.get_price().price * asset.weight;
    });
    sum
}