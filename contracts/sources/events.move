/// Module: events
/// 
/// This module defines all events emitted by the Yoshino protocol.
/// Events are separated from core logic for cleaner code and easier indexing.
module yoshino::events {
    use sui::event;

    /// Event emitted after a successful batch swap settlement
    /// 
    /// Privacy Note: We intentionally do NOT log individual user addresses.
    /// The blockchain will record input coins in system transactions, but 
    /// our application-layer logs remain clean to make simple tracking harder.
    public struct BatchSettled has copy, drop {
        /// Sequential batch identifier (incremented counter)
        batch_id: u64,
        /// The DeepBook Pool ID where the trade was executed
        pool_id: ID,
        /// Trade direction: true = buy (Base -> Quote), false = sell (Quote -> Base)
        is_buy: bool,
        /// Total amount of input asset aggregated from all users
        input_amount: u64,
        /// Total amount of output asset received from DeepBook
        output_amount: u64,
        /// Unix timestamp when the batch was executed
        timestamp: u64,
    }

    /// Emit a BatchSettled event
    /// 
    /// This function is called from shielded_pool::settle_batch after a successful trade.
    public fun emit_batch_settled(
        batch_id: u64,
        pool_id: ID,
        is_buy: bool,
        input_amount: u64,
        output_amount: u64,
        timestamp: u64,
    ) {
        event::emit(BatchSettled {
            batch_id,
            pool_id,
            is_buy,
            input_amount,
            output_amount,
            timestamp,
        });
    }
}
