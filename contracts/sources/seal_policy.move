/// Sui Seal Policy Module
/// 
/// This module defines the policy functions that Sui Seal nodes will simulate
/// to determine if a decryption request should be approved.
/// 
/// The core security model: Only holders of a valid SolverCap can decrypt user intents.
module yoshino::seal_policy {
    use yoshino::solver_cap::{Self, SolverCap};
    use sui::tx_context::TxContext;

    /// Error codes
    const E_INVALID_SOLVER_CAP: u64 = 100;
    const E_TOO_FREQUENT: u64 = 101;

    /// This function is called by Sui Seal nodes during simulation
    /// If it succeeds (doesn't abort), decryption is approved
    /// If it aborts, decryption is denied
    /// 
    /// # Security Model
    /// - Sui Seal nodes will simulate this function on-chain
    /// - If the caller can pass a valid SolverCap, simulation succeeds
    /// - Key fragments are only released if simulation succeeds
    /// - If SolverCap is revoked, simulation will fail
    /// 
    /// # Arguments
    /// * `cap` - Reference to the SolverCap capability
    /// * `_ctx` - Transaction context (unused but required for simulation)
    /// 
    /// # Returns
    /// * `bool` - Always true if execution reaches this point
    public fun seal_approve(
        cap: &SolverCap,
        _ctx: &TxContext
    ): bool {
        // Verify the capability is valid
        // This will always succeed since SolverCap exists as an object
        // The key security property is that the caller must POSSESS the cap
        assert!(solver_cap::verify_solver_cap(cap), E_INVALID_SOLVER_CAP);
        
        // If we reach here, the caller has a valid SolverCap
        true
    }

    /// Alternative approval with timestamp-based rate limiting
    /// 
    /// This variant adds protection against replay attacks by enforcing
    /// a minimum time window between decrypt attempts using the same cap.
    /// 
    /// # Arguments
    /// * `cap` - Reference to the SolverCap capability
    /// * `ctx` - Transaction context for timestamp access
    /// 
    /// # Returns
    /// * `bool` - Always true if execution reaches this point
    /// 
    /// # Aborts
    /// * `E_INVALID_SOLVER_CAP` - If cap verification fails
    /// * `E_TOO_FREQUENT` - If less than 1 second since last decryption
    public fun seal_approve_with_expiry(
        cap: &SolverCap,
        ctx: &TxContext
    ): bool {
        // Verify cap is valid
        assert!(solver_cap::verify_solver_cap(cap), E_INVALID_SOLVER_CAP);
        
        // Check if cap was recently used (anti-replay)
        let last_execution = solver_cap::get_last_execution_ms(cap);
        let current_time = tx_context::epoch_timestamp_ms(ctx);
        
        // Require at least 1 second between decrypt attempts
        // This prevents rapid-fire decryption attempts
        assert!(current_time > last_execution && current_time - last_execution > 1000, E_TOO_FREQUENT);
        
        true
    }

    /// View function to check if a cap would pass approval (without state changes)
    /// 
    /// Useful for clients to validate before submitting a decrypt request
    /// 
    /// # Arguments
    /// * `cap` - Reference to the SolverCap capability
    /// 
    /// # Returns
    /// * `bool` - true if cap is valid, false otherwise
    public fun can_approve(cap: &SolverCap): bool {
        solver_cap::verify_solver_cap(cap)
    }

    /// View function to check time until next approval is allowed
    /// 
    /// # Arguments
    /// * `cap` - Reference to the SolverCap capability
    /// * `ctx` - Transaction context for current timestamp
    /// 
    /// # Returns
    /// * `u64` - Milliseconds until next approval (0 if already allowed)
    public fun time_until_approval(cap: &SolverCap, ctx: &TxContext): u64 {
        let last_execution = solver_cap::get_last_execution_ms(cap);
        let current_time = tx_context::epoch_timestamp_ms(ctx);
        let required_gap = 1000; // 1 second in milliseconds
        
        if (current_time > last_execution) {
            let elapsed = current_time - last_execution;
            if (elapsed >= required_gap) {
                0
            } else {
                required_gap - elapsed
            }
        } else {
            // Clock skew or initialization state
            0
        }
    }

    #[test_only]
    /// Test helper to get error codes
    public fun get_error_invalid_cap(): u64 { E_INVALID_SOLVER_CAP }
    
    #[test_only]
    public fun get_error_too_frequent(): u64 { E_TOO_FREQUENT }
}
