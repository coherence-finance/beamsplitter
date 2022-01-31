use pyth_client::PriceConf;
use borsh::{BorshDeserialize, BorshSerialize};

#[derive(Debug, Clone, Copy, BorshSerialize, BorshDeserialize)]
pub struct AssetData<T: ReadablePrice = ConstantValueFeed> {
    pub data_feed: T,
    pub weight: i64,
}

impl<ConstantValueFeed: ReadablePrice + Default> Default for AssetData<ConstantValueFeed> {
        fn default() -> Self {
            AssetData {
                data_feed: ConstantValueFeed::default(),
                weight: 0,
            }
        }
}

pub trait ReadablePrice {
    fn get_price(&self) -> PriceConf; 
}

#[derive(Default, Clone, Copy, Debug, PartialEq, Eq, BorshDeserialize, BorshSerialize)]
pub struct ConstantValueFeed {
    pub constant: i64,
    pub expo: i32,
}

impl ReadablePrice for ConstantValueFeed {
    fn get_price(&self) -> PriceConf {
        PriceConf {
            price: self.constant,
            conf: 0,
            expo: self.expo,
        }
    }
}