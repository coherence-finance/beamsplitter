/// Generates the signer seeds for a [SplitcoinPrism].
#[macro_export]
macro_rules! generate_prism_seeds {
    ($token:expr) => {
        &[
            b"SplitcoinPrism".as_ref(),
            $token.mint.as_ref(),
            &[$token.bump],
        ]
    };
}
