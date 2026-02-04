#[test_only]
module yoshino::integration_tests {
    use sui::test_scenario::{Self as test, Scenario, next_tx, ctx};
    use sui::sui::SUI;
    use yoshino::shielded_pool::{Self, AdminCap, SolverCap, YoshinoState};

    // Test addresses
    const ADMIN: address = @0xAD;
    const SOLVER: address = @0x50;
    const USER1: address = @0x1;
    const USER2: address = @0x2;
    const USER3: address = @0x3;

    // ======== Helper Functions ========

    fun init_protocol(scenario: &mut Scenario) {
        next_tx(scenario, ADMIN);
        {
            shielded_pool::test_init(ctx(scenario));
        };
    }

    // ======== Integration Tests ========

    #[test]
    /// Test complete workflow: init -> mint caps -> distribute
    fun test_complete_setup_workflow() {
        let mut scenario = test::begin(ADMIN);
        
        // Step 1: Initialize protocol
        init_protocol(&mut scenario);
        
        // Step 2: Admin receives both caps
        next_tx(&mut scenario, ADMIN);
        {
            assert!(test::has_most_recent_for_sender<AdminCap>(&scenario), 0);
            assert!(test::has_most_recent_for_sender<SolverCap>(&scenario), 1);
        };
        
        // Step 3: Admin mints additional SolverCaps for backend workers
        next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = test::take_from_sender<AdminCap>(&scenario);
            
            // Mint caps for multiple solver nodes
            shielded_pool::mint_solver_cap(&admin_cap, SOLVER, ctx(&mut scenario));
            shielded_pool::mint_solver_cap(&admin_cap, USER1, ctx(&mut scenario));
            
            test::return_to_sender(&scenario, admin_cap);
        };
        
        // Step 4: Verify all solvers received their caps
        next_tx(&mut scenario, SOLVER);
        {
            assert!(test::has_most_recent_for_sender<SolverCap>(&scenario), 2);
        };
        
        next_tx(&mut scenario, USER1);
        {
            assert!(test::has_most_recent_for_sender<SolverCap>(&scenario), 3);
        };
        
        // Step 5: Verify state is accessible by all parties
        next_tx(&mut scenario, USER2);
        {
            let state = test::take_shared<YoshinoState>(&scenario);
            let batch_count = shielded_pool::get_batch_count(&state);
            assert!(batch_count == 0, 4);
            test::return_shared(state);
        };
        
        test::end(scenario);
    }

    #[test]
    /// Test admin delegation and permission model
    fun test_admin_delegation_model() {
        let mut scenario = test::begin(ADMIN);
        
        init_protocol(&mut scenario);
        
        // Admin can create multiple solver caps
        next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = test::take_from_sender<AdminCap>(&scenario);
            
            // Delegate to 3 different solver nodes
            shielded_pool::mint_solver_cap(&admin_cap, SOLVER, ctx(&mut scenario));
            shielded_pool::mint_solver_cap(&admin_cap, USER1, ctx(&mut scenario));
            shielded_pool::mint_solver_cap(&admin_cap, USER2, ctx(&mut scenario));
            
            test::return_to_sender(&scenario, admin_cap);
        };
        
        // Verify each solver has independent capability
        next_tx(&mut scenario, SOLVER);
        {
            let solver_cap = test::take_from_sender<SolverCap>(&scenario);
            test::return_to_sender(&scenario, solver_cap);
        };
        
        next_tx(&mut scenario, USER1);
        {
            let solver_cap = test::take_from_sender<SolverCap>(&scenario);
            test::return_to_sender(&scenario, solver_cap);
        };
        
        next_tx(&mut scenario, USER2);
        {
            let solver_cap = test::take_from_sender<SolverCap>(&scenario);
            test::return_to_sender(&scenario, solver_cap);
        };
        
        test::end(scenario);
    }

    #[test]
    /// Test state consistency across multiple transactions
    fun test_state_consistency_multi_tx() {
        let mut scenario = test::begin(ADMIN);
        
        init_protocol(&mut scenario);
        
        // Multiple different users access state
        next_tx(&mut scenario, USER1);
        {
            let state = test::take_shared<YoshinoState>(&scenario);
            let count1 = shielded_pool::get_batch_count(&state);
            test::return_shared(state);
            assert!(count1 == 0, 0);
        };
        
        next_tx(&mut scenario, USER2);
        {
            let state = test::take_shared<YoshinoState>(&scenario);
            let count2 = shielded_pool::get_batch_count(&state);
            test::return_shared(state);
            assert!(count2 == 0, 1);
        };
        
        next_tx(&mut scenario, USER3);
        {
            let state = test::take_shared<YoshinoState>(&scenario);
            let count3 = shielded_pool::get_batch_count(&state);
            test::return_shared(state);
            assert!(count3 == 0, 2);
        };
        
        test::end(scenario);
    }

    #[test]
    /// Test balance manager initialization and queries
    fun test_balance_manager_queries() {
        let mut scenario = test::begin(ADMIN);
        
        init_protocol(&mut scenario);
        
        next_tx(&mut scenario, ADMIN);
        {
            let state = test::take_shared<YoshinoState>(&scenario);
            
            // Query various balances (should all be 0 initially)
            let sui_balance = shielded_pool::get_balance<SUI>(&state);
            assert!(sui_balance == 0, 0);
            
            // Verify balance manager ID is set
            let _manager_id = shielded_pool::get_balance_manager_id(&state);
            
            test::return_shared(state);
        };
        
        test::end(scenario);
    }

    #[test]
    /// Test capability ownership verification
    fun test_capability_ownership() {
        let mut scenario = test::begin(ADMIN);
        
        init_protocol(&mut scenario);
        
        // Admin receives initial caps
        next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = test::take_from_sender<AdminCap>(&scenario);
            let solver_cap = test::take_from_sender<SolverCap>(&scenario);
            
            // Admin can use AdminCap
            shielded_pool::mint_solver_cap(&admin_cap, SOLVER, ctx(&mut scenario));
            
            test::return_to_sender(&scenario, admin_cap);
            test::return_to_sender(&scenario, solver_cap);
        };
        
        // Verify new SolverCap was transferred correctly
        next_tx(&mut scenario, SOLVER);
        {
            assert!(test::has_most_recent_for_sender<SolverCap>(&scenario), 0);
        };
        
        test::end(scenario);
    }

    #[test]
    /// Test protocol initialization creates correct objects
    fun test_protocol_object_creation() {
        let mut scenario = test::begin(ADMIN);
        
        init_protocol(&mut scenario);
        
        next_tx(&mut scenario, ADMIN);
        {
            // Check AdminCap exists
            let admin_cap = test::take_from_sender<AdminCap>(&scenario);
            test::return_to_sender(&scenario, admin_cap);
            
            // Check SolverCap exists
            let solver_cap = test::take_from_sender<SolverCap>(&scenario);
            test::return_to_sender(&scenario, solver_cap);
            
            // Check YoshinoState is shared
            let state = test::take_shared<YoshinoState>(&scenario);
            
            // Verify state has valid balance manager
            let _manager_id = shielded_pool::get_balance_manager_id(&state);
            let batch_count = shielded_pool::get_batch_count(&state);
            assert!(batch_count == 0, 0);
            
            test::return_shared(state);
        };
        
        test::end(scenario);
    }

    #[test]
    /// Test multiple solver cap minting in sequence
    fun test_sequential_solver_cap_minting() {
        let mut scenario = test::begin(ADMIN);
        
        init_protocol(&mut scenario);
        
        // First minting
        next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = test::take_from_sender<AdminCap>(&scenario);
            shielded_pool::mint_solver_cap(&admin_cap, SOLVER, ctx(&mut scenario));
            test::return_to_sender(&scenario, admin_cap);
        };
        
        // Second minting
        next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = test::take_from_sender<AdminCap>(&scenario);
            shielded_pool::mint_solver_cap(&admin_cap, USER1, ctx(&mut scenario));
            test::return_to_sender(&scenario, admin_cap);
        };
        
        // Third minting
        next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = test::take_from_sender<AdminCap>(&scenario);
            shielded_pool::mint_solver_cap(&admin_cap, USER2, ctx(&mut scenario));
            test::return_to_sender(&scenario, admin_cap);
        };
        
        // Verify all caps were distributed
        next_tx(&mut scenario, SOLVER);
        {
            assert!(test::has_most_recent_for_sender<SolverCap>(&scenario), 0);
        };
        
        next_tx(&mut scenario, USER1);
        {
            assert!(test::has_most_recent_for_sender<SolverCap>(&scenario), 1);
        };
        
        next_tx(&mut scenario, USER2);
        {
            assert!(test::has_most_recent_for_sender<SolverCap>(&scenario), 2);
        };
        
        test::end(scenario);
    }

    #[test]
    /// Test read-only view functions don't mutate state
    fun test_view_functions_immutable() {
        let mut scenario = test::begin(ADMIN);
        
        init_protocol(&mut scenario);
        
        next_tx(&mut scenario, USER1);
        {
            let state = test::take_shared<YoshinoState>(&scenario);
            
            // Call view functions multiple times
            let _count1 = shielded_pool::get_batch_count(&state);
            let _count2 = shielded_pool::get_batch_count(&state);
            let _count3 = shielded_pool::get_batch_count(&state);
            
            let _balance1 = shielded_pool::get_balance<SUI>(&state);
            let _balance2 = shielded_pool::get_balance<SUI>(&state);
            
            let _id1 = shielded_pool::get_balance_manager_id(&state);
            let _id2 = shielded_pool::get_balance_manager_id(&state);
            
            test::return_shared(state);
        };
        
        // Verify state unchanged
        next_tx(&mut scenario, USER2);
        {
            let state = test::take_shared<YoshinoState>(&scenario);
            let count = shielded_pool::get_batch_count(&state);
            assert!(count == 0, 0);
            test::return_shared(state);
        };
        
        test::end(scenario);
    }
}
