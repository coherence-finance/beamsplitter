use anchor_lang::prelude::*;

#[error]
pub enum BeamsplitterErrors {
    #[msg(
        "Attempted to register prism etf but Beamsplitter was not authority over passed token mint"
    )]
    NotMintAuthority, // 6000 - 0x1770
    #[msg("Attempted to register prism etf but intial token supply was NOT 0.")]
    NonZeroSupply, // 6001 - 0x1771
    #[msg("The to_mint cannot be the same as from_mint")]
    NoSameMintAccounts, // 6002 - 0x1772
    #[msg("Deposit was 0 when attempting to buy")]
    EmptyDeposit, // 6003 - 0x1773
    #[msg("The tokens being swapped must have different mints")]
    SwapTokensCannotMatch, // 6004 - 0x1774
    #[msg("Slippage tolerance exceeded")]
    SlippageExceeded, // 6005 - 0x1775
    #[msg("PrismEtf full, cannot add anymore assets")]
    ETFFull, // 6006 - 0x1776
    #[msg(
        "The ETF is already done being built and cannot be modified further without rebalancing"
    )]
    IsFinished, // 6007 - 0x1777
    #[msg("Attempted to finalize but etf is still pending (some assets not transferred)")]
    StillPending, // 6008 - 0x1778
    #[msg("Incorrect Order Status")]
    IncorrectOrderStatus, // 6009 - 0x1779
    #[msg("Incorrect Order Type")]
    IncorrectOrderType, // 6009 - 0x1779
    #[msg("Not enough approved.")]
    NotEnoughApproved, // 6010 - 0x177a
    #[msg("Index passed bound")]
    IndexPassedBound, // 6011 - 0x177b
    #[msg("Wrong asset mint. Mint keys did not match. Try changing index passed.")]
    WrongIndexMint, // 6012 - 0x177c
    #[msg("Scaling failed or overflowed.")]
    ScaleFailure, // 6013 - 0x177d
    #[msg("Decimal to u64 conversion failed or overflowed.")]
    U64Failure, // 6014 - 0x177e
    #[msg("Prism Etf was not done being designed when you tried to start an order.")]
    PrismEtfNotFinished, // 6015 - 0x177f
    #[msg("Attempted to start an order of 0")]
    ZeroOrder, // 6016 - 0x1780
    #[msg("Attempted to set a weight at 0")]
    ZeroWeight, // 6017 - 0x1781
}
