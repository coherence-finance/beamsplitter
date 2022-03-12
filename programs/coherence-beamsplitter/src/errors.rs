use anchor_lang::prelude::*;

#[error]
pub enum BeamsplitterErrors {
    #[msg("Attempted to register prism etf but Beamsplitter was not authority over passed token AND you are not Beamsplitter owner")]
    NotMintAuthority,
    #[msg("Attempted to register prism etf but intial token supply was NOT 0.")]
    NonZeroSupply,
    #[msg("The to_mint cannot be the same as from_mint")]
    NoSameMintAccounts,
    #[msg("Deposit was 0 when attempting to buy")]
    EmptyDeposit,
    #[msg("The tokens being swapped must have different mints")]
    SwapTokensCannotMatch,
    #[msg("Slippage tolerance exceeded")]
    SlippageExceeded,
    #[msg("PrismEtf full, cannot add anymore assets")]
    ETFFull,
    #[msg(
        "The ETF is already done being built and cannot be modified further without rebalancing"
    )]
    IsFinished,
    #[msg("Attempted to finalize but etf is still pending (some assets not transferred)")]
    StillPending,
}
