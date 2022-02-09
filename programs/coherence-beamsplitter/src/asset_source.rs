use pyth_client::PriceConf;

use anchor_lang::prelude::{AnchorDeserialize, AnchorSerialize};

#[derive(Debug, Clone, Copy, Default, AnchorDeserialize, AnchorSerialize)]
pub struct AssetSource {
    pub data_source: Source,
    pub weight: i64,
}

#[derive(Debug, Clone, Copy, AnchorDeserialize, AnchorSerialize)]
pub enum Source {
    Constant { price: i64, expo: i32 },
}

impl Default for Source {
    fn default() -> Self {
        Source::Constant { price: 0, expo: 0 }
    }
}

pub trait ReadablePrice {
    fn get_price(&self) -> PriceConf;
}

impl ReadablePrice for Source {
    #[inline(never)]
    fn get_price(&self) -> PriceConf {
        use Source::*;

        match *self {
            Constant { price, expo } => PriceConf {
                price,
                conf: 0,
                expo,
            },
        }
    }
}
