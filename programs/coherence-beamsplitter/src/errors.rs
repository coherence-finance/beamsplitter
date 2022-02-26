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
}
