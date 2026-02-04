#[test_only]
module yoshino::shielded_pool_tests {
    use sui::test_scenario::{Self as test, Scenario, next_tx, ctx};
    use sui::sui::SUI;
    use yoshino::shielded_pool::{Self, AdminCap, SolverCap, YoshinoState};

    // Test addresses
    const ADMIN: address = @0xAD;
    const SOLVER: address = @0x50;
    const USER1: address = @0x1;
    const USER2: address = @0x2;

    // ======== Helper Functions ========

    /// Initialize the protocol for testing
    fun init_protocol(scenario: &mut Scenario) {
        next_tx(scenario, ADMIN);
        {
            shielded_pool::test_init(ctx(scenario));
        };
    }

    // ======== Test Cases ========

    #[test]
    /// Test protocol initialization
    fun test_init_protocol() {
        let mut scenario = test::begin(ADMIN);
        
        // Initialize the protocol
        init_protocol(&mut scenario);
        
        // Verify AdminCap was created and transferred to deployer
        next_tx(&mut scenario, ADMIN);
        {
            assert!(test::has_most_recent_for_sender<AdminCap>(&scenario), 0);
            assert!(test::has_most_recent_for_sender<SolverCap>(&scenario), 1);
        };
        
        // Verify YoshinoState was shared
        next_tx(&mut scenario, ADMIN);
        {
            let state = test::take_shared<YoshinoState>(&scenario);
            
            // Check initial batch count is 0
            assert!(shielded_pool::get_batch_count(&state) == 0, 2);
            
            test::return_shared(state);
        };
        
        test::end(scenario);
    }

    #[test]
    /// Test minting a new SolverCap
    fun test_mint_solver_cap() {
        let mut scenario = test::begin(ADMIN);
        
        init_protocol(&mut scenario);
        
        // Admin mints a new SolverCap for SOLVER address
        next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = test::take_from_sender<AdminCap>(&scenario);
            
            shielded_pool::mint_solver_cap(
                &admin_cap,
                SOLVER,
                ctx(&mut scenario)
            );
            
            test::return_to_sender(&scenario, admin_cap);
        };
        
        // Verify SOLVER received the SolverCap
        next_tx(&mut scenario, SOLVER);
        {
            assert!(test::has_most_recent_for_sender<SolverCap>(&scenario), 0);
        };
        
        test::end(scenario);
    }

    #[test]
    /// Test getting batch count
    fun test_get_batch_count() {
        let mut scenario = test::begin(ADMIN);
        
        init_protocol(&mut scenario);
        
        next_tx(&mut scenario, ADMIN);
        {
            let state = test::take_shared<YoshinoState>(&scenario);
            
            let batch_count = shielded_pool::get_batch_count(&state);
            assert!(batch_count == 0, 0);
            
            test::return_shared(state);
        };
        
        test::end(scenario);
    }

    #[test]
    /// Test getting balance manager ID
    fun test_get_balance_manager_id() {
        let mut scenario = test::begin(ADMIN);
        
        init_protocol(&mut scenario);
        
        next_tx(&mut scenario, ADMIN);
        {
            let state = test::take_shared<YoshinoState>(&scenario);
            
            // Should not panic - just verify ID exists
            let _id = shielded_pool::get_balance_manager_id(&state);
            
            test::return_shared(state);
        };
        
        test::end(scenario);
    }

    #[test]
    /// Test balance retrieval for SUI
    fun test_get_balance() {
        let mut scenario = test::begin(ADMIN);
        
        init_protocol(&mut scenario);
        
        next_tx(&mut scenario, ADMIN);
        {
            let state = test::take_shared<YoshinoState>(&scenario);
            
            // Initially should be 0
            let balance = shielded_pool::get_balance<SUI>(&state);
            assert!(balance == 0, 0);
            
            test::return_shared(state);
        };
        
        test::end(scenario);
    }

    #[test]
    /// Test that only AdminCap holder can mint SolverCap
    fun test_admin_cap_required_for_mint() {
        let mut scenario = test::begin(ADMIN);
        
        init_protocol(&mut scenario);
        
        // Verify admin can mint
        next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = test::take_from_sender<AdminCap>(&scenario);
            
            shielded_pool::mint_solver_cap(
                &admin_cap,
                USER1,
                ctx(&mut scenario)
            );
            
            test::return_to_sender(&scenario, admin_cap);
        };
        
        // Verify USER1 received the cap
        next_tx(&mut scenario, USER1);
        {
            assert!(test::has_most_recent_for_sender<SolverCap>(&scenario), 0);
        };
        
        test::end(scenario);
    }

    #[test]
    /// Test state object is properly shared
    fun test_state_is_shared() {
        let mut scenario = test::begin(ADMIN);
        
        init_protocol(&mut scenario);
        
        // Multiple addresses should be able to access shared state
        next_tx(&mut scenario, USER1);
        {
            let state = test::take_shared<YoshinoState>(&scenario);
            test::return_shared(state);
        };
        
        next_tx(&mut scenario, USER2);
        {
            let state = test::take_shared<YoshinoState>(&scenario);
            test::return_shared(state);
        };
        
        test::end(scenario);
    }

    #[test]
    /// Test multiple solver caps can be minted
    fun test_multiple_solver_caps() {
        let mut scenario = test::begin(ADMIN);
        
        init_protocol(&mut scenario);
        
        next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = test::take_from_sender<AdminCap>(&scenario);
            
            // Mint for multiple solvers
            shielded_pool::mint_solver_cap(&admin_cap, SOLVER, ctx(&mut scenario));
            shielded_pool::mint_solver_cap(&admin_cap, USER1, ctx(&mut scenario));
            shielded_pool::mint_solver_cap(&admin_cap, USER2, ctx(&mut scenario));
            
            test::return_to_sender(&scenario, admin_cap);
        };
        
        // Verify each received their cap
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
    /// Test protocol state consistency
    fun test_protocol_state_consistency() {
        let mut scenario = test::begin(ADMIN);
        
        init_protocol(&mut scenario);
        
        next_tx(&mut scenario, ADMIN);
        {
            let state = test::take_shared<YoshinoState>(&scenario);
            
            // Verify initial state
            let batch_count = shielded_pool::get_batch_count(&state);
            let _manager_id = shielded_pool::get_balance_manager_id(&state);
            
            assert!(batch_count == 0, 0);
            
            test::return_shared(state);
        };
        
        test::end(scenario);
    }
}
