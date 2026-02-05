/// Module: solver_cap
/// 
/// Capability system for Yoshino protocol
/// Defines SolverCap which grants exclusive rights to execute batched trades
/// This is critical for Sui Seal integration and access control
module yoshino::solver_cap {
    use sui::event;

    // ======== Error Codes ========

    const E_UNAUTHORIZED: u64 = 0;
    const E_INVALID_SOLVER_CAP: u64 = 1;

    // ======== Capability Objects ========

    /// Capability to execute batched trades
    /// Held by the Resolver Agent
    /// This cap is used to prove authorization to Sui Seal network
    public struct SolverCap has key, store {
        id: UID,
        /// Counter for executed batches
        batches_executed: u64,
        /// Timestamp of last execution (milliseconds)
        last_execution_ms: u64,
    }

    /// Admin capability for creating SolverCaps
    /// Only the admin can create or revoke SolverCaps
    public struct SolverAdmin has key {
        id: UID,
    }

    // ======== Events ========

    /// Event emitted when SolverCap is created
    public struct SolverCapCreated has copy, drop {
        cap_id: ID,
        recipient: address,
    }

    /// Event emitted when SolverCap is transferred
    public struct SolverCapTransferred has copy, drop {
        cap_id: ID,
        from: address,
        to: address,
    }

    /// Event emitted when SolverCap is revoked
    public struct SolverCapRevoked has copy, drop {
        cap_id: ID,
    }

    /// Event emitted when batch execution is recorded
    public struct BatchExecutionRecorded has copy, drop {
        cap_id: ID,
        batch_number: u64,
        timestamp_ms: u64,
    }

    // ======== Init Function ========

    /// Initialize the module - creates admin capability
    fun init(ctx: &mut TxContext) {
        let admin = SolverAdmin {
            id: object::new(ctx),
        };
        transfer::transfer(admin, ctx.sender());
    }

    // ======== Admin Functions ========

    /// Create a new SolverCap (only admin can do this)
    /// The SolverCap grants the holder exclusive rights to:
    /// 1. Decrypt user intents via Sui Seal
    /// 2. Execute batched trades on the vault
    /// 3. Borrow funds for atomic execution
    public fun create_solver_cap(
        _admin: &SolverAdmin,
        recipient: address,
        ctx: &mut TxContext
    ) {
        let cap = SolverCap {
            id: object::new(ctx),
            batches_executed: 0,
            last_execution_ms: 0,
        };
        
        let cap_id = object::id(&cap);
        
        event::emit(SolverCapCreated {
            cap_id,
            recipient,
        });
        
        transfer::public_transfer(cap, recipient);
    }

    /// Revoke a SolverCap by transferring it to a burn address
    /// This immediately prevents the holder from executing any more batches
    /// or decrypting any more user intents
    public fun revoke_solver_cap(
        _admin: &SolverAdmin,
        cap: SolverCap,
    ) {
        let cap_id = object::id(&cap);
        
        event::emit(SolverCapRevoked {
            cap_id,
        });
        
        // Transfer to burn address
        transfer::public_transfer(cap, @0x0);
    }

    // ======== Verification Functions ========

    /// Verify that a reference to SolverCap is valid
    /// This is used in vault functions to check authorization
    /// Additional checks can be added here for future requirements
    public fun verify_solver_cap(_cap: &SolverCap): bool {
        // For now, just holding the cap is sufficient
        // In the future, could add expiration checks, rate limits, etc.
        true
    }

    /// Get the number of batches executed by this cap
    public fun get_batches_executed(cap: &SolverCap): u64 {
        cap.batches_executed
    }

    /// Get the timestamp of last execution
    public fun get_last_execution_ms(cap: &SolverCap): u64 {
        cap.last_execution_ms
    }

    /// Get the ID of the SolverCap
    public fun get_cap_id(cap: &SolverCap): ID {
        object::id(cap)
    }

    // ======== Execution Functions ========

    /// Increment batch counter (called after successful execution)
    /// This records the execution and updates the timestamp
    public fun increment_batch_counter(cap: &mut SolverCap, timestamp_ms: u64) {
        cap.batches_executed = cap.batches_executed + 1;
        cap.last_execution_ms = timestamp_ms;
        
        event::emit(BatchExecutionRecorded {
            cap_id: object::id(cap),
            batch_number: cap.batches_executed,
            timestamp_ms,
        });
    }

    // ======== Transfer Functions ========

    /// Transfer SolverCap to a new address
    /// Can be used for key rotation or decentralization
    /// Allows the protocol to change the Resolver without redeploying contracts
    public fun transfer_solver_cap(
        cap: SolverCap,
        new_owner: address,
        ctx: &TxContext
    ) {
        let cap_id = object::id(&cap);
        let from = ctx.sender();
        
        event::emit(SolverCapTransferred {
            cap_id,
            from,
            to: new_owner,
        });
        
        transfer::public_transfer(cap, new_owner);
    }

    // ======== Test-only Functions ========

    #[test_only]
    /// Test-only init function for unit tests
    public fun test_init(ctx: &mut TxContext) {
        init(ctx);
    }
}
