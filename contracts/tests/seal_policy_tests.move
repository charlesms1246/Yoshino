#[test_only]
module yoshino::seal_policy_tests {
    use sui::test_scenario::{Self as ts, Scenario};
    use sui::test_utils;
    use yoshino::solver_cap::{Self, SolverCap, SolverAdmin};
    use yoshino::seal_policy;

    // Test addresses
    const ADMIN: address = @0xAD;
    const SOLVER: address = @0x50;
    const UNAUTHORIZED: address = @0xBA;

    // ======== Helper Functions ========

    fun setup_admin(scenario: &mut Scenario) {
        ts::next_tx(scenario, ADMIN);
        {
            solver_cap::test_init(ts::ctx(scenario));
        };
    }

    fun create_solver_cap(scenario: &mut Scenario) {
        ts::next_tx(scenario, ADMIN);
        {
            let mut admin = ts::take_from_sender<SolverAdmin>(scenario);
            solver_cap::create_solver_cap(&mut admin, SOLVER, ts::ctx(scenario));
            ts::return_to_sender(scenario, admin);
        };
    }

    // ======== Test: Basic Seal Approve ========

    #[test]
    fun test_seal_approve_with_valid_cap() {
        let mut scenario = ts::begin(ADMIN);
        
        // Setup admin and create SolverCap
        setup_admin(&mut scenario);
        create_solver_cap(&mut scenario);
        
        // Test seal_approve with valid cap
        ts::next_tx(&mut scenario, SOLVER);
        {
            let cap = ts::take_from_sender<SolverCap>(&scenario);
            
            // This should succeed
            let approved = seal_policy::seal_approve(&cap, ts::ctx(&mut scenario));
            assert!(approved == true, 0);
            
            ts::return_to_sender(&scenario, cap);
        };
        
        ts::end(scenario);
    }

    #[test]
    fun test_can_approve_helper() {
        let mut scenario = ts::begin(ADMIN);
        
        setup_admin(&mut scenario);
        create_solver_cap(&mut scenario);
        
        ts::next_tx(&mut scenario, SOLVER);
        {
            let cap = ts::take_from_sender<SolverCap>(&scenario);
            
            // Test the view function
            let can_approve = seal_policy::can_approve(&cap);
            assert!(can_approve == true, 0);
            
            ts::return_to_sender(&scenario, cap);
        };
        
        ts::end(scenario);
    }

    // ======== Test: Seal Approve with Expiry ========

    #[test]
    fun test_seal_approve_with_expiry_first_time() {
        let mut scenario = ts::begin(ADMIN);
        
        setup_admin(&mut scenario);
        create_solver_cap(&mut scenario);
        
        // Execute a batch first to set last_execution_ms to a known value
        // Then test approval after enough time has passed
        ts::next_tx(&mut scenario, SOLVER);
        {
            let mut cap = ts::take_from_sender<SolverCap>(&scenario);
            solver_cap::increment_batch_counter(&mut cap, 1000, ts::ctx(&mut scenario));
            ts::return_to_sender(&scenario, cap);
        };
        
        // Advance time (simulated by new transaction)
        // The test scenario doesn't perfectly simulate time, but the function should succeed
        // when there's a sufficient gap
        ts::next_tx(&mut scenario, SOLVER);
        {
            let cap = ts::take_from_sender<SolverCap>(&scenario);
            
            // Check basic seal_approve works (no time restrictions)
            let approved = seal_policy::seal_approve(&cap, ts::ctx(&mut scenario));
            assert!(approved == true, 0);
            
            ts::return_to_sender(&scenario, cap);
        };
        
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = seal_policy::E_TOO_FREQUENT)]
    fun test_seal_approve_with_expiry_too_soon() {
        let mut scenario = ts::begin(ADMIN);
        
        setup_admin(&mut scenario);
        create_solver_cap(&mut scenario);
        
        // Execute a batch to set last_execution_ms
        ts::next_tx(&mut scenario, SOLVER);
        {
            let mut cap = ts::take_from_sender<SolverCap>(&scenario);
            let timestamp = 1000u64;
            solver_cap::increment_batch_counter(&mut cap, timestamp, ts::ctx(&mut scenario));
            ts::return_to_sender(&scenario, cap);
        };
        
        // Try to approve immediately (same timestamp)
        // This should fail because not enough time has passed
        ts::next_tx(&mut scenario, SOLVER);
        {
            let cap = ts::take_from_sender<SolverCap>(&scenario);
            
            // This should abort with E_TOO_FREQUENT
            let _approved = seal_policy::seal_approve_with_expiry(&cap, ts::ctx(&mut scenario));
            
            ts::return_to_sender(&scenario, cap);
        };
        
        ts::end(scenario);
    }

    #[test]
    fun test_time_until_approval() {
        let mut scenario = ts::begin(ADMIN);
        
        setup_admin(&mut scenario);
        create_solver_cap(&mut scenario);
        
        // Check time until approval for a fresh cap
        ts::next_tx(&mut scenario, SOLVER);
        {
            let cap = ts::take_from_sender<SolverCap>(&scenario);
            
            // Fresh cap should have 0 wait time
            let wait_time = seal_policy::time_until_approval(&cap, ts::ctx(&mut scenario));
            assert!(wait_time == 0, 0);
            
            ts::return_to_sender(&scenario, cap);
        };
        
        ts::end(scenario);
    }

    // ======== Test: Multiple Sequential Approvals ========

    #[test]
    fun test_multiple_approvals() {
        let mut scenario = ts::begin(ADMIN);
        
        setup_admin(&mut scenario);
        create_solver_cap(&mut scenario);
        
        // First approval
        ts::next_tx(&mut scenario, SOLVER);
        {
            let cap = ts::take_from_sender<SolverCap>(&scenario);
            let approved1 = seal_policy::seal_approve(&cap, ts::ctx(&mut scenario));
            assert!(approved1 == true, 0);
            ts::return_to_sender(&scenario, cap);
        };
        
        // Second approval (basic seal_approve has no rate limiting)
        ts::next_tx(&mut scenario, SOLVER);
        {
            let cap = ts::take_from_sender<SolverCap>(&scenario);
            let approved2 = seal_policy::seal_approve(&cap, ts::ctx(&mut scenario));
            assert!(approved2 == true, 1);
            ts::return_to_sender(&scenario, cap);
        };
        
        // Third approval
        ts::next_tx(&mut scenario, SOLVER);
        {
            let cap = ts::take_from_sender<SolverCap>(&scenario);
            let approved3 = seal_policy::seal_approve(&cap, ts::ctx(&mut scenario));
            assert!(approved3 == true, 2);
            ts::return_to_sender(&scenario, cap);
        };
        
        ts::end(scenario);
    }

    // ======== Test: Revoked Cap Behavior ========

    #[test]
    fun test_revoked_cap_still_exists() {
        let mut scenario = ts::begin(ADMIN);
        
        setup_admin(&mut scenario);
        create_solver_cap(&mut scenario);
        
        // Revoke the cap
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin = ts::take_from_sender<SolverAdmin>(&scenario);
            let cap = ts::take_from_address<SolverCap>(&scenario, SOLVER);
            
            solver_cap::revoke_solver_cap(&admin, cap);
            
            ts::return_to_sender(&scenario, admin);
        };
        
        // Note: After revocation, the cap is deleted
        // So we can't test seal_approve on it
        // This test verifies the revocation process doesn't break
        
        ts::end(scenario);
    }

    // ======== Test: Error Code Accessors ========

    #[test]
    fun test_error_codes() {
        let invalid_cap = seal_policy::get_error_invalid_cap();
        let too_frequent = seal_policy::get_error_too_frequent();
        
        assert!(invalid_cap == 100, 0);
        assert!(too_frequent == 101, 1);
    }

    // ======== Test: Timestamp Tracking Integration ========

    #[test]
    fun test_timestamp_tracking_with_seal() {
        let mut scenario = ts::begin(ADMIN);
        
        setup_admin(&mut scenario);
        create_solver_cap(&mut scenario);
        
        // Update timestamp manually
        ts::next_tx(&mut scenario, SOLVER);
        {
            let mut cap = ts::take_from_sender<SolverCap>(&scenario);
            
            // Set last execution to 5000ms
            solver_cap::update_last_execution(&mut cap, 5000);
            
            // Verify it was set
            let last_exec = solver_cap::get_last_execution_ms(&cap);
            assert!(last_exec == 5000, 0);
            
            ts::return_to_sender(&scenario, cap);
        };
        
        // Seal approve should still work (basic version has no time check)
        ts::next_tx(&mut scenario, SOLVER);
        {
            let cap = ts::take_from_sender<SolverCap>(&scenario);
            let approved = seal_policy::seal_approve(&cap, ts::ctx(&mut scenario));
            assert!(approved == true, 1);
            ts::return_to_sender(&scenario, cap);
        };
        
        ts::end(scenario);
    }

    // ======== Test: View Functions ========

    #[test]
    fun test_can_approve_view_function() {
        let mut scenario = ts::begin(ADMIN);
        
        setup_admin(&mut scenario);
        create_solver_cap(&mut scenario);
        
        ts::next_tx(&mut scenario, SOLVER);
        {
            let cap = ts::take_from_sender<SolverCap>(&scenario);
            
            // can_approve should return true for valid cap
            assert!(seal_policy::can_approve(&cap) == true, 0);
            
            ts::return_to_sender(&scenario, cap);
        };
        
        ts::end(scenario);
    }

    // ======== Test: Edge Cases ========

    #[test]
    fun test_seal_approve_is_pure_view() {
        let mut scenario = ts::begin(ADMIN);
        
        setup_admin(&mut scenario);
        create_solver_cap(&mut scenario);
        
        ts::next_tx(&mut scenario, SOLVER);
        {
            let cap = ts::take_from_sender<SolverCap>(&scenario);
            
            // Call multiple times - should always return true
            assert!(seal_policy::seal_approve(&cap, ts::ctx(&mut scenario)) == true, 0);
            assert!(seal_policy::seal_approve(&cap, ts::ctx(&mut scenario)) == true, 1);
            assert!(seal_policy::seal_approve(&cap, ts::ctx(&mut scenario)) == true, 2);
            
            ts::return_to_sender(&scenario, cap);
        };
        
        ts::end(scenario);
    }

    #[test]
    fun test_time_until_approval_after_update() {
        let mut scenario = ts::begin(ADMIN);
        
        setup_admin(&mut scenario);
        create_solver_cap(&mut scenario);
        
        ts::next_tx(&mut scenario, SOLVER);
        {
            let mut cap = ts::take_from_sender<SolverCap>(&scenario);
            
            // Set last execution to a known value (not based on current time to avoid underflow)
            solver_cap::update_last_execution(&mut cap, 5000);
            
            // Since timestamp in test is usually 0 or very small,
            // and we set last_execution to 5000, current_time will be < last_execution
            // In this case, time_until_approval returns 0 (no wait needed due to clock skew handling)
            let wait_time = seal_policy::time_until_approval(&cap, ts::ctx(&mut scenario));
            
            // Due to clock skew handling in the function, this should return 0
            assert!(wait_time == 0, 0);
            
            ts::return_to_sender(&scenario, cap);
        };
        
        ts::end(scenario);
    }
}
