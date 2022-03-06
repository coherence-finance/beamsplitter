/* use std::cmp;

use anchor_lang::prelude::{AccountInfo, ProgramError};
use serum_dex::critbit::Slab;

use crate::swap::MarketAccounts;

/// The number of [AccountInfo] fields in the [MarketAccounts] struct
const MKT_ACCT_FIELD_NUM: usize = 11;

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

pub fn extract_market_accounts<'info>(
    accounts: &[AccountInfo<'info>],
) -> Result<Vec<MarketAccounts<'info>>, ProgramError> {
    // Slice passed must chunk without leftover
    if accounts.len() % 11 != 0 {
        return Err(ProgramError::InvalidArgument.into());
    }
    let mut mkt_accounts_vec = Vec::new();
    let mkt_chunks = accounts.chunks(MKT_ACCT_FIELD_NUM);
    for accounts_batch in mkt_chunks {
        let mkt_acct = MarketAccounts {
            market: accounts_batch[0].clone(),
            open_orders: accounts_batch[1].clone(),
            request_queue: accounts_batch[2].clone(),
            event_queue: accounts_batch[3].clone(),
            bids: accounts_batch[4].clone(),
            asks: accounts_batch[5].clone(),
            order_payer_token_account: accounts_batch[6].clone(),
            coin_vault: accounts_batch[7].clone(),
            pc_vault: accounts_batch[8].clone(),
            vault_signer: accounts_batch[9].clone(),
            coin_wallet: accounts_batch[10].clone(),
        };
        mkt_accounts_vec.push(mkt_acct);
    }

    return Ok(mkt_accounts_vec);
}
*/
