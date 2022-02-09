use crate::asset_source::{AssetSource, ReadablePrice};

// TODO replace 8 with shared max size
/// Helper function that returns Prism etf's value
pub fn token_value(asset_source: &[AssetSource; 8]) -> i64 {
    let mut sum: i64 = 0;
    asset_source.iter().for_each(|asset| {
        sum += asset.data_source.get_price().price * asset.weight;
    });
    sum
}
