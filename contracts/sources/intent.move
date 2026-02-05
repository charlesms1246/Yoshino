/// Intent Module
/// 
/// Defines the data structure for encrypted user intents
/// Intents are trading orders encrypted with Sui Seal policies
module yoshino::intent {
    use std::string::{Self, String};
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::event;

    // ======== Error Codes ========

    const E_UNAUTHORIZED: u64 = 200;
    const E_ALREADY_EXECUTED: u64 = 201;
    const E_ALREADY_CANCELLED: u64 = 202;
    const E_INVALID_STATUS: u64 = 203;

    // ======== Intent Status Constants ========

    const STATUS_PENDING: u8 = 0;
    const STATUS_EXECUTED: u8 = 1;
    const STATUS_CANCELLED: u8 = 2;

    // ======== Structs ========

    /// Decoded intent data (after decryption by Resolver)
    /// This represents the actual trading instruction once decrypted
    public struct Trade has drop, copy {
        /// User who submitted this trade
        user: address,
        /// Amount to trade
        amount: u64,
        /// true = buy (bid), false = sell (ask)
        is_bid: bool,
        /// Minimum acceptable price (for slippage protection)
        min_price: u64,
    }

    /// Represents a user's trading intent (encrypted on-chain)
    /// The encrypted_data field contains the actual trading instructions
    /// which can only be decrypted by a SolverCap holder via Sui Seal
    public struct Intent has key, store {
        id: UID,
        /// User who created this intent
        user: address,
        /// Encrypted intent data (blob)
        /// Contains: { action: "swap", from_coin: "USDC", to_coin: "SUI", amount: 100 }
        encrypted_data: vector<u8>,
        /// Sui Seal policy module to call for decryption
        policy_module: String,
        /// Sui Seal policy function name
        policy_function: String,
        /// Timestamp when intent was created (milliseconds)
        created_at_ms: u64,
        /// Intent status: 0 = pending, 1 = executed, 2 = cancelled
        status: u8,
    }

    // ======== Events ========

    /// Event emitted when a new intent is created
    public struct IntentCreated has copy, drop {
        intent_id: ID,
        user: address,
        created_at_ms: u64,
    }

    /// Event emitted when intent is executed
    public struct IntentExecuted has copy, drop {
        intent_id: ID,
        user: address,
        executed_at_ms: u64,
    }

    /// Event emitted when intent is cancelled
    public struct IntentCancelled has copy, drop {
        intent_id: ID,
        user: address,
        cancelled_at_ms: u64,
    }

    // ======== Intent Creation ========

    /// Create a new intent (called by user)
    /// 
    /// The encrypted_data should contain the user's trading instructions
    /// encrypted using the Sui Seal SDK with the appropriate policy
    /// 
    /// # Arguments
    /// * `encrypted_data` - Encrypted blob containing the intent details
    /// * `ctx` - Transaction context
    /// 
    /// # Returns
    /// * `Intent` - The newly created intent object
    public fun create_intent(
        encrypted_data: vector<u8>,
        ctx: &mut TxContext
    ): Intent {
        let user = tx_context::sender(ctx);
        let created_at_ms = tx_context::epoch_timestamp_ms(ctx);
        
        let intent = Intent {
            id: object::new(ctx),
            user,
            encrypted_data,
            policy_module: string::utf8(b"yoshino::seal_policy"),
            policy_function: string::utf8(b"seal_approve"),
            created_at_ms,
            status: STATUS_PENDING,
        };
        
        event::emit(IntentCreated {
            intent_id: object::id(&intent),
            user,
            created_at_ms,
        });
        
        intent
    }

    /// Create intent with custom policy function
    /// Allows specifying different seal approval functions (e.g., with expiry)
    public fun create_intent_with_policy(
        encrypted_data: vector<u8>,
        policy_function: String,
        ctx: &mut TxContext
    ): Intent {
        let user = tx_context::sender(ctx);
        let created_at_ms = tx_context::epoch_timestamp_ms(ctx);
        
        let intent = Intent {
            id: object::new(ctx),
            user,
            encrypted_data,
            policy_module: string::utf8(b"yoshino::seal_policy"),
            policy_function,
            created_at_ms,
            status: STATUS_PENDING,
        };
        
        event::emit(IntentCreated {
            intent_id: object::id(&intent),
            user,
            created_at_ms,
        });
        
        intent
    }

    // ======== Intent State Management ========

    /// Mark intent as executed
    /// Should be called by the batch execution logic after successful trade
    /// 
    /// # Arguments
    /// * `intent` - Mutable reference to the intent
    /// * `ctx` - Transaction context for timestamp
    /// 
    /// # Aborts
    /// * `E_ALREADY_EXECUTED` - If intent was already executed
    /// * `E_ALREADY_CANCELLED` - If intent was cancelled
    public fun mark_executed(intent: &mut Intent, ctx: &TxContext) {
        assert!(intent.status == STATUS_PENDING, E_ALREADY_EXECUTED);
        intent.status = STATUS_EXECUTED;
        
        event::emit(IntentExecuted {
            intent_id: object::id(intent),
            user: intent.user,
            executed_at_ms: tx_context::epoch_timestamp_ms(ctx),
        });
    }

    /// Cancel an intent (only by original user)
    /// Users can cancel pending intents before they are batched
    /// 
    /// # Arguments
    /// * `intent` - Mutable reference to the intent
    /// * `ctx` - Transaction context
    /// 
    /// # Aborts
    /// * `E_UNAUTHORIZED` - If caller is not the intent creator
    /// * `E_ALREADY_EXECUTED` - If intent was already executed
    /// * `E_ALREADY_CANCELLED` - If intent was already cancelled
    public fun cancel_intent(intent: &mut Intent, ctx: &TxContext) {
        assert!(intent.user == tx_context::sender(ctx), E_UNAUTHORIZED);
        assert!(intent.status == STATUS_PENDING, E_ALREADY_CANCELLED);
        intent.status = STATUS_CANCELLED;
        
        event::emit(IntentCancelled {
            intent_id: object::id(intent),
            user: intent.user,
            cancelled_at_ms: tx_context::epoch_timestamp_ms(ctx),
        });
    }

    // ======== Getter Functions ========

    /// Get the encrypted data from an intent
    public fun get_encrypted_data(intent: &Intent): vector<u8> {
        intent.encrypted_data
    }

    /// Get the user address who created the intent
    public fun get_user(intent: &Intent): address {
        intent.user
    }

    /// Get the current status of the intent
    public fun get_status(intent: &Intent): u8 {
        intent.status
    }

    /// Get the creation timestamp
    public fun get_created_at_ms(intent: &Intent): u64 {
        intent.created_at_ms
    }

    /// Get the policy module name
    public fun get_policy_module(intent: &Intent): String {
        intent.policy_module
    }

    /// Get the policy function name
    public fun get_policy_function(intent: &Intent): String {
        intent.policy_function
    }

    /// Check if intent is pending
    public fun is_pending(intent: &Intent): bool {
        intent.status == STATUS_PENDING
    }

    /// Check if intent is executed
    public fun is_executed(intent: &Intent): bool {
        intent.status == STATUS_EXECUTED
    }

    /// Check if intent is cancelled
    public fun is_cancelled(intent: &Intent): bool {
        intent.status == STATUS_CANCELLED
    }

    // ======== Trade Construction Functions ========

    /// Create a Trade struct (used by Resolver after decryption)
    public fun create_trade(
        user: address,
        amount: u64,
        is_bid: bool,
        min_price: u64
    ): Trade {
        Trade {
            user,
            amount,
            is_bid,
            min_price,
        }
    }

    /// Get trade details
    public fun get_trade_user(trade: &Trade): address { trade.user }
    public fun get_trade_amount(trade: &Trade): u64 { trade.amount }
    public fun get_trade_is_bid(trade: &Trade): bool { trade.is_bid }
    public fun get_trade_min_price(trade: &Trade): u64 { trade.min_price }

    // ======== Test-only Functions ========

    #[test_only]
    /// Get status constants for testing
    public fun get_status_pending(): u8 { STATUS_PENDING }
    
    #[test_only]
    public fun get_status_executed(): u8 { STATUS_EXECUTED }
    
    #[test_only]
    public fun get_status_cancelled(): u8 { STATUS_CANCELLED }
    
    #[test_only]
    /// Get error codes for testing
    public fun get_error_unauthorized(): u64 { E_UNAUTHORIZED }
    
    #[test_only]
    public fun get_error_already_executed(): u64 { E_ALREADY_EXECUTED }
    
    #[test_only]
    public fun get_error_already_cancelled(): u64 { E_ALREADY_CANCELLED }
}
