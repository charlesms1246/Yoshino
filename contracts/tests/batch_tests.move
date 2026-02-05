#[test_only]
module yoshino::batch_tests {
    use sui::test_scenario::{Self as ts, Scenario};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use yoshino::vault::{Self, Vault, AdminCap};
    use yoshino::solver_cap::{Self, SolverCap, SolverAdmin};
    use yoshino::intent::{Self, Trade};

    // Test addresses
    const ADMIN: address = @0xAD;
    const SOLVER: address = @0x50;
    const USER_A: address = @0xA11CE;
    const USER_B: address = @0xB0B;
    const USER_C: address = @0xCA701;

    // ======== Helper Functions ========

    fun setup_vault(scenario: &mut Scenario) {
        // Initialize vault module
        ts::next_tx(scenario, ADMIN);
        {
            vault::test_init(ts::ctx(scenario));
        };
        
        // Create vault
        ts::next_tx(scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(scenario);
            vault::create_vault<SUI>(&admin_cap, ts::ctx(scenario));
            ts::return_to_sender(scenario, admin_cap);
        };
    }

    fun setup_solver_cap(scenario: &mut Scenario) {
        // Initialize solver_cap module
        ts::next_tx(scenario, ADMIN);
        {
            solver_cap::test_init(ts::ctx(scenario));
        };
        
        // Create SolverCap
        ts::next_tx(scenario, ADMIN);
        {
            let mut admin = ts::take_from_sender<SolverAdmin>(scenario);
            solver_cap::create_solver_cap(&mut admin, SOLVER, ts::ctx(scenario));
            ts::return_to_sender(scenario, admin);
        };
    }

    fun deposit_for_user(scenario: &mut Scenario, user: address, amount: u64) {
        ts::next_tx(scenario, user);
        {
            let mut vault = ts::take_shared<Vault<SUI>>(scenario);
            let payment = coin::mint_for_testing<SUI>(amount, ts::ctx(scenario));
            vault::deposit(&mut vault, payment, ts::ctx(scenario));
            ts::return_shared(vault);
        };
    }

    // ======== Test: Simple Batch Execution ========

    #[test]
    fun test_simple_batch_execution() {
        let mut scenario = ts::begin(ADMIN);
        
        // Setup vault and solver cap
        setup_vault(&mut scenario);
        setup_solver_cap(&mut scenario);
        
        // User A deposits 1000 SUI
        deposit_for_user(&mut scenario, USER_A, 1000);
        
        // User B deposits 500 SUI
        deposit_for_user(&mut scenario, USER_B, 500);
        
        // Execute batch: A buys 100, B sells 50
        ts::next_tx(&mut scenario, SOLVER);
        {
            let mut vault = ts::take_shared<Vault<SUI>>(&scenario);
            let mut solver_cap = ts::take_from_sender<SolverCap>(&scenario);
            
            // Create trades
            let mut trades = vector::empty<Trade>();
            vector::push_back(&mut trades, intent::create_trade(USER_A, 100, true, 0));
            vector::push_back(&mut trades, intent::create_trade(USER_B, 50, false, 0));
            
            // Execute batch
            let net_amount = vault::execute_batch(&mut solver_cap, &mut vault, trades, ts::ctx(&mut scenario));
            
            // Net should be 50 (100 bid - 50 ask)
            assert!(net_amount == 50, 0);
            
            // Verify solver cap batch counter incremented
            assert!(solver_cap::get_batches_executed(&solver_cap) == 1, 1);
            
            ts::return_shared(vault);
            ts::return_to_sender(&scenario, solver_cap);
        };
        
        ts::end(scenario);
    }

    #[test]
    fun test_batch_ledger_updates() {
        let mut scenario = ts::begin(ADMIN);
        
        setup_vault(&mut scenario);
        setup_solver_cap(&mut scenario);
        
        // Users deposit
        deposit_for_user(&mut scenario, USER_A, 1000);
        deposit_for_user(&mut scenario, USER_B, 1000);
        
        // Verify initial balances
        ts::next_tx(&mut scenario, ADMIN);
        {
            let vault = ts::take_shared<Vault<SUI>>(&scenario);
            assert!(vault::get_balance(&vault, USER_A) == 1000, 0);
            assert!(vault::get_balance(&vault, USER_B) == 1000, 1);
            ts::return_shared(vault);
        };
        
        // Execute batch
        ts::next_tx(&mut scenario, SOLVER);
        {
            let mut vault = ts::take_shared<Vault<SUI>>(&scenario);
            let mut solver_cap = ts::take_from_sender<SolverCap>(&scenario);
            
            let mut trades = vector::empty<Trade>();
            vector::push_back(&mut trades, intent::create_trade(USER_A, 200, true, 0));
            vector::push_back(&mut trades, intent::create_trade(USER_B, 200, false, 0));
            
            vault::execute_batch(&mut solver_cap, &mut vault, trades, ts::ctx(&mut scenario));
            
            ts::return_shared(vault);
            ts::return_to_sender(&scenario, solver_cap);
        };
        
        // Verify balances updated
        // Note: In this simplified version, deduct and credit are same amount
        // In production, actual asset swaps would occur
        ts::next_tx(&mut scenario, ADMIN);
        {
            let vault = ts::take_shared<Vault<SUI>>(&scenario);
            assert!(vault::get_balance(&vault, USER_A) == 1000, 2);
            assert!(vault::get_balance(&vault, USER_B) == 1000, 3);
            ts::return_shared(vault);
        };
        
        ts::end(scenario);
    }

    #[test]
    fun test_batch_with_perfect_match() {
        let mut scenario = ts::begin(ADMIN);
        
        setup_vault(&mut scenario);
        setup_solver_cap(&mut scenario);
        
        deposit_for_user(&mut scenario, USER_A, 1000);
        deposit_for_user(&mut scenario, USER_B, 1000);
        
        // Execute batch where bids == asks
        ts::next_tx(&mut scenario, SOLVER);
        {
            let mut vault = ts::take_shared<Vault<SUI>>(&scenario);
            let mut solver_cap = ts::take_from_sender<SolverCap>(&scenario);
            
            let mut trades = vector::empty<Trade>();
            vector::push_back(&mut trades, intent::create_trade(USER_A, 100, true, 0));
            vector::push_back(&mut trades, intent::create_trade(USER_B, 100, false, 0));
            
            let net_amount = vault::execute_batch(&mut solver_cap, &mut vault, trades, ts::ctx(&mut scenario));
            
            // Net should be 0 (perfect match)
            assert!(net_amount == 0, 0);
            
            ts::return_shared(vault);
            ts::return_to_sender(&scenario, solver_cap);
        };
        
        ts::end(scenario);
    }

    #[test]
    fun test_batch_with_multiple_users() {
        let mut scenario = ts::begin(ADMIN);
        
        setup_vault(&mut scenario);
        setup_solver_cap(&mut scenario);
        
        // Three users deposit
        deposit_for_user(&mut scenario, USER_A, 1000);
        deposit_for_user(&mut scenario, USER_B, 1000);
        deposit_for_user(&mut scenario, USER_C, 1000);
        
        // Execute batch with 3 users
        ts::next_tx(&mut scenario, SOLVER);
        {
            let mut vault = ts::take_shared<Vault<SUI>>(&scenario);
            let mut solver_cap = ts::take_from_sender<SolverCap>(&scenario);
            
            let mut trades = vector::empty<Trade>();
            vector::push_back(&mut trades, intent::create_trade(USER_A, 100, true, 0));
            vector::push_back(&mut trades, intent::create_trade(USER_B, 50, true, 0));
            vector::push_back(&mut trades, intent::create_trade(USER_C, 80, false, 0));
            
            // Total bid: 150, Total ask: 80, Net: 70 (more buyers)
            let net_amount = vault::execute_batch(&mut solver_cap, &mut vault, trades, ts::ctx(&mut scenario));
            assert!(net_amount == 70, 0);
            
            ts::return_shared(vault);
            ts::return_to_sender(&scenario, solver_cap);
        };
        
        ts::end(scenario);
    }

    #[test]
    fun test_batch_aggregation() {
        let mut scenario = ts::begin(ADMIN);
        
        setup_vault(&mut scenario);
        setup_solver_cap(&mut scenario);
        
        deposit_for_user(&mut scenario, USER_A, 2000);
        deposit_for_user(&mut scenario, USER_B, 2000);
        deposit_for_user(&mut scenario, USER_C, 2000);
        
        // Test aggregation with multiple bids and asks
        ts::next_tx(&mut scenario, SOLVER);
        {
            let mut vault = ts::take_shared<Vault<SUI>>(&scenario);
            let mut solver_cap = ts::take_from_sender<SolverCap>(&scenario);
            
            let mut trades = vector::empty<Trade>();
            // Multiple bids
            vector::push_back(&mut trades, intent::create_trade(USER_A, 100, true, 0));
            vector::push_back(&mut trades, intent::create_trade(USER_A, 50, true, 0));
            // Multiple asks
            vector::push_back(&mut trades, intent::create_trade(USER_B, 80, false, 0));
            vector::push_back(&mut trades, intent::create_trade(USER_C, 120, false, 0));
            
            // Total bid: 150, Total ask: 200, Net: 50 (more sellers)
            let net_amount = vault::execute_batch(&mut solver_cap, &mut vault, trades, ts::ctx(&mut scenario));
            assert!(net_amount == 50, 0);
            
            ts::return_shared(vault);
            ts::return_to_sender(&scenario, solver_cap);
        };
        
        ts::end(scenario);
    }

    #[test]
    fun test_empty_batch() {
        let mut scenario = ts::begin(ADMIN);
        
        setup_vault(&mut scenario);
        setup_solver_cap(&mut scenario);
        
        // Execute empty batch
        ts::next_tx(&mut scenario, SOLVER);
        {
            let mut vault = ts::take_shared<Vault<SUI>>(&scenario);
            let mut solver_cap = ts::take_from_sender<SolverCap>(&scenario);
            
            let trades = vector::empty<Trade>();
            let net_amount = vault::execute_batch(&mut solver_cap, &mut vault, trades, ts::ctx(&mut scenario));
            
            // Empty batch should have net 0
            assert!(net_amount == 0, 0);
            
            ts::return_shared(vault);
            ts::return_to_sender(&scenario, solver_cap);
        };
        
        ts::end(scenario);
    }

    #[test]
    fun test_multiple_batch_executions() {
        let mut scenario = ts::begin(ADMIN);
        
        setup_vault(&mut scenario);
        setup_solver_cap(&mut scenario);
        
        deposit_for_user(&mut scenario, USER_A, 5000);
        deposit_for_user(&mut scenario, USER_B, 5000);
        
        // Execute first batch
        ts::next_tx(&mut scenario, SOLVER);
        {
            let mut vault = ts::take_shared<Vault<SUI>>(&scenario);
            let mut solver_cap = ts::take_from_sender<SolverCap>(&scenario);
            
            let mut trades = vector::empty<Trade>();
            vector::push_back(&mut trades, intent::create_trade(USER_A, 100, true, 0));
            vector::push_back(&mut trades, intent::create_trade(USER_B, 50, false, 0));
            
            vault::execute_batch(&mut solver_cap, &mut vault, trades, ts::ctx(&mut scenario));
            assert!(solver_cap::get_batches_executed(&solver_cap) == 1, 0);
            
            ts::return_shared(vault);
            ts::return_to_sender(&scenario, solver_cap);
        };
        
        // Execute second batch
        ts::next_tx(&mut scenario, SOLVER);
        {
            let mut vault = ts::take_shared<Vault<SUI>>(&scenario);
            let mut solver_cap = ts::take_from_sender<SolverCap>(&scenario);
            
            let mut trades = vector::empty<Trade>();
            vector::push_back(&mut trades, intent::create_trade(USER_A, 200, true, 0));
            vector::push_back(&mut trades, intent::create_trade(USER_B, 150, false, 0));
            
            vault::execute_batch(&mut solver_cap, &mut vault, trades, ts::ctx(&mut scenario));
            assert!(solver_cap::get_batches_executed(&solver_cap) == 2, 1);
            
            ts::return_shared(vault);
            ts::return_to_sender(&scenario, solver_cap);
        };
        
        // Execute third batch
        ts::next_tx(&mut scenario, SOLVER);
        {
            let mut vault = ts::take_shared<Vault<SUI>>(&scenario);
            let mut solver_cap = ts::take_from_sender<SolverCap>(&scenario);
            
            let mut trades = vector::empty<Trade>();
            vector::push_back(&mut trades, intent::create_trade(USER_A, 50, false, 0));
            vector::push_back(&mut trades, intent::create_trade(USER_B, 100, true, 0));
            
            vault::execute_batch(&mut solver_cap, &mut vault, trades, ts::ctx(&mut scenario));
            assert!(solver_cap::get_batches_executed(&solver_cap) == 3, 2);
            
            ts::return_shared(vault);
            ts::return_to_sender(&scenario, solver_cap);
        };
        
        ts::end(scenario);
    }

    #[test]
    fun test_trade_struct_creation() {
        // Test Trade struct construction
        let trade = intent::create_trade(USER_A, 1000, true, 5000);
        
        assert!(intent::get_trade_user(&trade) == USER_A, 0);
        assert!(intent::get_trade_amount(&trade) == 1000, 1);
        assert!(intent::get_trade_is_bid(&trade) == true, 2);
        assert!(intent::get_trade_min_price(&trade) == 5000, 3);
    }
}
