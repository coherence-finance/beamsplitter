use pyth_client::PriceConf;

use anchor_lang::prelude::{AnchorDeserialize, AnchorSerialize, Pubkey};

#[derive(Debug, Clone, Copy, Default, AnchorDeserialize, AnchorSerialize)]
pub struct AssetData {
    pub data_feed: Feed,
    pub weight: i64,
}

#[derive(Debug, Clone, Copy, AnchorDeserialize, AnchorSerialize)]
pub enum Feed {
    Constant { price: i64, expo: i32 },
    DexFeed { last_price: i64, expo: i32, market_account: Pubkey },
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
            DexFeed { last_price, expo, market_account } => PriceConf {
                price: last_price,
                conf: 0,
                expo,
            }
        }
    }
}
