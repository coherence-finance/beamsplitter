use pyth_client::PriceConf;

use anchor_lang::prelude::{AnchorDeserialize, AnchorSerialize};

#[derive(Debug, Clone, Copy, Default, AnchorDeserialize, AnchorSerialize)]
pub struct AssetData {
    pub data_feed: Feed,
    pub weight: i64,
}

#[derive(Debug, Clone, Copy, AnchorDeserialize, AnchorSerialize)]
pub enum Feed {
    Constant { price: i64, expo: i32 },
}

impl Default for Feed {
    fn default() -> Self {
        Feed::Constant { price: 0, expo: 0 }
    }
}

pub trait ReadablePrice {
    fn get_price(&self) -> PriceConf;
}

impl ReadablePrice for Feed {
    #[inline(never)]
    fn get_price(&self) -> PriceConf {
        use Feed::*;

        match *self {
            Constant { price, expo } => PriceConf {
                price,
                conf: 0,
                expo,
            },
        }
    }
}
