use anchor_lang::{AnchorDeserialize, AnchorSerialize};

// The status of a Prism Etf being built
#[derive(Debug, Copy, Clone, AnchorDeserialize, AnchorSerialize, PartialEq, Eq)]
pub enum PrismEtfStatus {
    UNFINISHED,
    FINISHED,
}
impl Default for PrismEtfStatus {
    fn default() -> Self {
        PrismEtfStatus::UNFINISHED
    }
}

// The type of order being used by the state object
#[derive(Debug, Copy, Clone, AnchorDeserialize, AnchorSerialize, PartialEq, Eq)]
pub enum OrderType {
    DECONSTRUCTION,
    CONSTRUCTION,
}

impl Default for OrderType {
    fn default() -> Self {
        OrderType::CONSTRUCTION
    }
}

// The status of an order state
#[derive(Debug, Copy, Clone, AnchorDeserialize, AnchorSerialize, PartialEq, Eq)]
pub enum OrderStatus {
    PENDING,
    CANCELLED,
    SUCCEEDED,
}

impl Default for OrderStatus {
    fn default() -> Self {
        OrderStatus::SUCCEEDED
    }
}

#[derive(Debug, Copy, Clone, AnchorDeserialize, AnchorSerialize, PartialEq, Eq)]
pub enum RebalancingMode {
    OFF,
    MANUAL,
}

impl Default for RebalancingMode {
    fn default() -> Self {
        RebalancingMode::OFF
    }
}

#[derive(Debug, Copy, Clone, AnchorDeserialize, AnchorSerialize, PartialEq, Eq)]
pub enum AutorebalancingSchedule{
    NEVER,
}

impl Default for AutorebalancingSchedule {
    fn default() -> Self {
        AutorebalancingSchedule::NEVER
    }
}
