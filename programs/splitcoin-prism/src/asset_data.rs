use pyth_client::PriceConf;

use anchor_lang::prelude::{AnchorDeserialize, AnchorSerialize};

#[derive(Debug, Copy, Clone, AnchorDeserialize, AnchorSerialize)]
pub struct AssetData<Feed = ConstantValueFeed> 
    where Feed: ReadablePrice + anchor_lang::AnchorDeserialize + anchor_lang::AnchorSerialize {
    pub data_feed: Feed,
    pub weight: i64,
}

impl<ConstantValueFeed> Default for AssetData<ConstantValueFeed> 
    where ConstantValueFeed: ReadablePrice + anchor_lang::AnchorDeserialize + anchor_lang::AnchorSerialize + Default {
        #[inline(never)]
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

#[derive(Default, Copy, Clone, Debug, PartialEq, Eq, AnchorDeserialize, AnchorSerialize)]
pub struct ConstantValueFeed {
    pub constant: i64,
    pub expo: i32,
}

impl ReadablePrice for ConstantValueFeed {
    #[inline(never)]
    fn get_price(&self) -> PriceConf {
        PriceConf {
            price: self.constant,
            conf: 0,
            expo: self.expo,
        }
    }
}