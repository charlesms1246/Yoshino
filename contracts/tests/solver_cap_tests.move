#[test_only]
module yoshino::solver_cap_tests {
    use sui::test_scenario::{Self as ts, Scenario};
    use yoshino::solver_cap::{Self, SolverCap, SolverAdmin};

    const ADMIN: address = @0xAD;
    const SOLVER: address = @0x50;
    const NEW_SOLVER: address = @0x51;

    // ======== Helper Functions ========

    /// Initialize the solver_cap module
    fun setup(scenario: &mut Scenario) {
        ts::next_tx(scenario, ADMIN);
        {
            solver_cap::test_init(ts::ctx(scenario));
        };
    }

    // ======== Test Cases ========

    #[test]
    /// Test creating a SolverCap
    fun test_create_solver_cap() {
        let mut scenario = ts::begin(ADMIN);
        setup(&mut scenario);
        
        // Admin creates SolverCap for SOLVER
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin = ts::take_from_sender<SolverAdmin>(&scenario);
            solver_cap::create_solver_cap(&admin, SOLVER, ts::ctx(&mut scenario));
            ts::return_to_sender(&scenario, admin);
        };
        
        // Verify solver received the cap
        ts::next_tx(&mut scenario, SOLVER);
        {
            let cap = ts::take_from_sender<SolverCap>(&scenario);
            
            // Verify initial state
            assert!(solver_cap::get_batches_executed(&cap) == 0, 0);
            assert!(solver_cap::get_last_execution_ms(&cap) == 0, 1);
            assert!(solver_cap::verify_solver_cap(&cap), 2);
            
            ts::return_to_sender(&scenario, cap);
        };
        
        ts::end(scenario);
    }

    #[test]
    /// Test incrementing batch counter
    fun test_batch_counter_increment() {
        let mut scenario = ts::begin(ADMIN);
        setup(&mut scenario);
        
        // Create SolverCap
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin = ts::take_from_sender<SolverAdmin>(&scenario);
            solver_cap::create_solver_cap(&admin, SOLVER, ts::ctx(&mut scenario));
            ts::return_to_sender(&scenario, admin);
        };
        
        // Increment counter
        ts::next_tx(&mut scenario, SOLVER);
        {
            let mut cap = ts::take_from_sender<SolverCap>(&scenario);
            
            // Simulate executing a batch
            solver_cap::increment_batch_counter(&mut cap, 1000, ts::ctx(&mut scenario));
            assert!(solver_cap::get_batches_executed(&cap) == 1, 0);
            assert!(solver_cap::get_last_execution_ms(&cap) == 1000, 1);
            
            // Execute another batch
            solver_cap::increment_batch_counter(&mut cap, 2000, ts::ctx(&mut scenario));
            assert!(solver_cap::get_batches_executed(&cap) == 2, 2);
            assert!(solver_cap::get_last_execution_ms(&cap) == 2000, 3);
            
            ts::return_to_sender(&scenario, cap);
        };
        
        ts::end(scenario);
    }

    #[test]
    /// Test transferring SolverCap to new owner
    fun test_transfer_solver_cap() {
        let mut scenario = ts::begin(ADMIN);
        setup(&mut scenario);
        
        // Create SolverCap
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin = ts::take_from_sender<SolverAdmin>(&scenario);
            solver_cap::create_solver_cap(&admin, SOLVER, ts::ctx(&mut scenario));
            ts::return_to_sender(&scenario, admin);
        };
        
        // SOLVER transfers cap to NEW_SOLVER
        ts::next_tx(&mut scenario, SOLVER);
        {
            let cap = ts::take_from_sender<SolverCap>(&scenario);
            solver_cap::transfer_solver_cap(cap, NEW_SOLVER, ts::ctx(&mut scenario));
        };
        
        // Verify NEW_SOLVER received the cap
        ts::next_tx(&mut scenario, NEW_SOLVER);
        {
            let cap = ts::take_from_sender<SolverCap>(&scenario);
            assert!(solver_cap::verify_solver_cap(&cap), 0);
            ts::return_to_sender(&scenario, cap);
        };
        
        ts::end(scenario);
    }

    #[test]
    /// Test revoking SolverCap
    fun test_revoke_solver_cap() {
        let mut scenario = ts::begin(ADMIN);
        setup(&mut scenario);
        
        // Create SolverCap
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin = ts::take_from_sender<SolverAdmin>(&scenario);
            solver_cap::create_solver_cap(&admin, SOLVER, ts::ctx(&mut scenario));
            ts::return_to_sender(&scenario, admin);
        };
        
        // SOLVER has the cap
        ts::next_tx(&mut scenario, SOLVER);
        {
            assert!(ts::has_most_recent_for_sender<SolverCap>(&scenario), 0);
        };
        
        // Admin revokes the cap
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin = ts::take_from_sender<SolverAdmin>(&scenario);
            let cap = ts::take_from_address<SolverCap>(&scenario, SOLVER);
            solver_cap::revoke_solver_cap(&admin, cap);
            ts::return_to_sender(&scenario, admin);
        };
        
        // Cap is now at burn address, SOLVER no longer has it
        ts::next_tx(&mut scenario, SOLVER);
        {
            assert!(!ts::has_most_recent_for_sender<SolverCap>(&scenario), 1);
        };
        
        ts::end(scenario);
    }

    #[test]
    /// Test creating multiple SolverCaps
    fun test_multiple_solver_caps() {
        let mut scenario = ts::begin(ADMIN);
        setup(&mut scenario);
        
        // Create first SolverCap
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin = ts::take_from_sender<SolverAdmin>(&scenario);
            solver_cap::create_solver_cap(&admin, SOLVER, ts::ctx(&mut scenario));
            ts::return_to_sender(&scenario, admin);
        };
        
        // Create second SolverCap
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin = ts::take_from_sender<SolverAdmin>(&scenario);
            solver_cap::create_solver_cap(&admin, NEW_SOLVER, ts::ctx(&mut scenario));
            ts::return_to_sender(&scenario, admin);
        };
        
        // Both solvers should have their caps
        ts::next_tx(&mut scenario, SOLVER);
        {
            let cap = ts::take_from_sender<SolverCap>(&scenario);
            assert!(solver_cap::verify_solver_cap(&cap), 0);
            ts::return_to_sender(&scenario, cap);
        };
        
        ts::next_tx(&mut scenario, NEW_SOLVER);
        {
            let cap = ts::take_from_sender<SolverCap>(&scenario);
            assert!(solver_cap::verify_solver_cap(&cap), 1);
            ts::return_to_sender(&scenario, cap);
        };
        
        ts::end(scenario);
    }

    #[test]
    /// Test getting cap ID
    fun test_get_cap_id() {
        let mut scenario = ts::begin(ADMIN);
        setup(&mut scenario);
        
        // Create SolverCap
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin = ts::take_from_sender<SolverAdmin>(&scenario);
            solver_cap::create_solver_cap(&admin, SOLVER, ts::ctx(&mut scenario));
            ts::return_to_sender(&scenario, admin);
        };
        
        // Get cap ID
        ts::next_tx(&mut scenario, SOLVER);
        {
            let cap = ts::take_from_sender<SolverCap>(&scenario);
            let _cap_id = solver_cap::get_cap_id(&cap);
            // ID should be non-zero and valid
            ts::return_to_sender(&scenario, cap);
        };
        
        ts::end(scenario);
    }

    #[test]
    /// Test batch execution tracking across multiple executions
    fun test_batch_execution_tracking() {
        let mut scenario = ts::begin(ADMIN);
        setup(&mut scenario);
        
        // Create SolverCap
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin = ts::take_from_sender<SolverAdmin>(&scenario);
            solver_cap::create_solver_cap(&admin, SOLVER, ts::ctx(&mut scenario));
            ts::return_to_sender(&scenario, admin);
        };
        
        // Execute multiple batches
        ts::next_tx(&mut scenario, SOLVER);
        {
            let mut cap = ts::take_from_sender<SolverCap>(&scenario);
            
            // Execute 5 batches
            let mut i = 0;
            while (i < 5) {
                let timestamp = 1000 + (i * 100);
                solver_cap::increment_batch_counter(&mut cap, timestamp, ts::ctx(&mut scenario));
                i = i + 1;
            };
            
            // Verify final state
            assert!(solver_cap::get_batches_executed(&cap) == 5, 0);
            assert!(solver_cap::get_last_execution_ms(&cap) == 1400, 1);
            
            ts::return_to_sender(&scenario, cap);
        };
        
        ts::end(scenario);
    }

    #[test]
    /// Test that verification always succeeds for valid cap
    fun test_verification_always_succeeds() {
        let mut scenario = ts::begin(ADMIN);
        setup(&mut scenario);
        
        // Create SolverCap
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin = ts::take_from_sender<SolverAdmin>(&scenario);
            solver_cap::create_solver_cap(&admin, SOLVER, ts::ctx(&mut scenario));
            ts::return_to_sender(&scenario, admin);
        };
        
        // Verify cap multiple times
        ts::next_tx(&mut scenario, SOLVER);
        {
            let cap = ts::take_from_sender<SolverCap>(&scenario);
            
            // Verification should always return true
            assert!(solver_cap::verify_solver_cap(&cap), 0);
            assert!(solver_cap::verify_solver_cap(&cap), 1);
            assert!(solver_cap::verify_solver_cap(&cap), 2);
            
            ts::return_to_sender(&scenario, cap);
        };
        
        ts::end(scenario);
    }

    #[test]
    /// Test transfer preserves batch count
    fun test_transfer_preserves_state() {
        let mut scenario = ts::begin(ADMIN);
        setup(&mut scenario);
        
        // Create SolverCap
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin = ts::take_from_sender<SolverAdmin>(&scenario);
            solver_cap::create_solver_cap(&admin, SOLVER, ts::ctx(&mut scenario));
            ts::return_to_sender(&scenario, admin);
        };
        
        // Execute some batches
        ts::next_tx(&mut scenario, SOLVER);
        {
            let mut cap = ts::take_from_sender<SolverCap>(&scenario);
            solver_cap::increment_batch_counter(&mut cap, 1000, ts::ctx(&mut scenario));
            solver_cap::increment_batch_counter(&mut cap, 2000, ts::ctx(&mut scenario));
            solver_cap::increment_batch_counter(&mut cap, 3000, ts::ctx(&mut scenario));
            ts::return_to_sender(&scenario, cap);
        };
        
        // Transfer cap
        ts::next_tx(&mut scenario, SOLVER);
        {
            let cap = ts::take_from_sender<SolverCap>(&scenario);
            solver_cap::transfer_solver_cap(cap, NEW_SOLVER, ts::ctx(&mut scenario));
        };
        
        // Verify state is preserved
        ts::next_tx(&mut scenario, NEW_SOLVER);
        {
            let cap = ts::take_from_sender<SolverCap>(&scenario);
            assert!(solver_cap::get_batches_executed(&cap) == 3, 0);
            assert!(solver_cap::get_last_execution_ms(&cap) == 3000, 1);
            ts::return_to_sender(&scenario, cap);
        };
        
        ts::end(scenario);
    }
}
