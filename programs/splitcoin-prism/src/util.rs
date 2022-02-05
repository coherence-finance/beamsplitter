use crate::asset_data::{AssetData, ReadablePrice};

// TODO replace 8 with shared max size
/// Helper function that returns Prism token's value
pub fn token_value(asset_data: &[AssetData; 8]) -> i64 {
    let mut sum: i64 = 0;
    asset_data.iter().for_each(|asset| {
        sum += asset.data_feed.get_price().price * asset.weight;
    });
    sum
}
