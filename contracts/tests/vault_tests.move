#[test_only]
module yoshino::vault_tests {
    use sui::test_scenario::{Self as ts, Scenario};
    use sui::coin::{Self};
    use sui::sui::SUI;
    use yoshino::vault::{Self, Vault, AdminCap};

    const ADMIN: address = @0xAD;
    const USER1: address = @0x1;
    const USER2: address = @0x2;

    // ======== Helper Functions ========

    /// Initialize vault module and create a SUI vault
    fun setup_vault(scenario: &mut Scenario) {
        // Initialize module
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

    // ======== Test Cases ========

    #[test]
    /// Test basic deposit and withdrawal flow
    fun test_deposit_and_withdraw() {
        let mut scenario = ts::begin(ADMIN);
        setup_vault(&mut scenario);
        
        // User deposits
        ts::next_tx(&mut scenario, USER1);
        {
            let mut vault = ts::take_shared<Vault<SUI>>(&scenario);
            let coin = coin::mint_for_testing<SUI>(1000, ts::ctx(&mut scenario));
            vault::deposit(&mut vault, coin, ts::ctx(&mut scenario));
            
            // Verify balance
            assert!(vault::get_balance(&vault, USER1) == 1000, 0);
            assert!(vault::get_pool_balance(&vault) == 1000, 1);
            assert!(vault::get_user_count(&vault) == 1, 2);
            
            ts::return_shared(vault);
        };
        
        // User withdraws half
        ts::next_tx(&mut scenario, USER1);
        {
            let mut vault = ts::take_shared<Vault<SUI>>(&scenario);
            let coin = vault::withdraw(&mut vault, 500, ts::ctx(&mut scenario));
            
            // Verify balance
            assert!(vault::get_balance(&vault, USER1) == 500, 3);
            assert!(vault::get_pool_balance(&vault) == 500, 4);
            assert!(coin::value(&coin) == 500, 5);
            
            coin::burn_for_testing(coin);
            ts::return_shared(vault);
        };
        
        ts::end(scenario);
    }

    #[test]
    /// Test multiple users depositing
    fun test_multiple_users() {
        let mut scenario = ts::begin(ADMIN);
        setup_vault(&mut scenario);
        
        // USER1 deposits
        ts::next_tx(&mut scenario, USER1);
        {
            let mut vault = ts::take_shared<Vault<SUI>>(&scenario);
            let coin = coin::mint_for_testing<SUI>(1000, ts::ctx(&mut scenario));
            vault::deposit(&mut vault, coin, ts::ctx(&mut scenario));
            ts::return_shared(vault);
        };
        
        // USER2 deposits
        ts::next_tx(&mut scenario, USER2);
        {
            let mut vault = ts::take_shared<Vault<SUI>>(&scenario);
            let coin = coin::mint_for_testing<SUI>(2000, ts::ctx(&mut scenario));
            vault::deposit(&mut vault, coin, ts::ctx(&mut scenario));
            ts::return_shared(vault);
        };
        
        // Verify balances
        ts::next_tx(&mut scenario, ADMIN);
        {
            let vault = ts::take_shared<Vault<SUI>>(&scenario);
            
            assert!(vault::get_balance(&vault, USER1) == 1000, 0);
            assert!(vault::get_balance(&vault, USER2) == 2000, 1);
            assert!(vault::get_pool_balance(&vault) == 3000, 2);
            assert!(vault::get_user_count(&vault) == 2, 3);
            
            ts::return_shared(vault);
        };
        
        ts::end(scenario);
    }

    #[test]
    /// Test multiple deposits from same user
    fun test_multiple_deposits_same_user() {
        let mut scenario = ts::begin(ADMIN);
        setup_vault(&mut scenario);
        
        // First deposit
        ts::next_tx(&mut scenario, USER1);
        {
            let mut vault = ts::take_shared<Vault<SUI>>(&scenario);
            let coin = coin::mint_for_testing<SUI>(1000, ts::ctx(&mut scenario));
            vault::deposit(&mut vault, coin, ts::ctx(&mut scenario));
            
            assert!(vault::get_balance(&vault, USER1) == 1000, 0);
            assert!(vault::get_user_count(&vault) == 1, 1);
            
            ts::return_shared(vault);
        };
        
        // Second deposit
        ts::next_tx(&mut scenario, USER1);
        {
            let mut vault = ts::take_shared<Vault<SUI>>(&scenario);
            let coin = coin::mint_for_testing<SUI>(500, ts::ctx(&mut scenario));
            vault::deposit(&mut vault, coin, ts::ctx(&mut scenario));
            
            // Balance should accumulate, user count stays same
            assert!(vault::get_balance(&vault, USER1) == 1500, 2);
            assert!(vault::get_user_count(&vault) == 1, 3);
            
            ts::return_shared(vault);
        };
        
        ts::end(scenario);
    }

    #[test]
    /// Test borrow and repay (hot potato pattern)
    fun test_borrow_and_repay() {
        let mut scenario = ts::begin(ADMIN);
        setup_vault(&mut scenario);
        
        // Setup vault with funds
        ts::next_tx(&mut scenario, USER1);
        {
            let mut vault = ts::take_shared<Vault<SUI>>(&scenario);
            let coin = coin::mint_for_testing<SUI>(1000, ts::ctx(&mut scenario));
            vault::deposit(&mut vault, coin, ts::ctx(&mut scenario));
            ts::return_shared(vault);
        };
        
        // Borrow and repay in same transaction
        ts::next_tx(&mut scenario, USER1);
        {
            let mut vault = ts::take_shared<Vault<SUI>>(&scenario);
            
            let initial_pool = vault::get_pool_balance(&vault);
            
            // Borrow
            let (borrowed_coin, promise) = vault::borrow(&mut vault, 100, ts::ctx(&mut scenario));
            
            // Pool should decrease
            assert!(vault::get_pool_balance(&vault) == initial_pool - 100, 0);
            assert!(coin::value(&borrowed_coin) == 100, 1);
            
            // Must repay in same transaction
            vault::repay(&mut vault, borrowed_coin, promise);
            
            // Pool should be restored
            assert!(vault::get_pool_balance(&vault) == initial_pool, 2);
            
            ts::return_shared(vault);
        };
        
        ts::end(scenario);
    }

    #[test]
    /// Test borrow and repay with extra (profit scenario)
    fun test_borrow_repay_with_extra() {
        let mut scenario = ts::begin(ADMIN);
        setup_vault(&mut scenario);
        
        // Setup vault with funds
        ts::next_tx(&mut scenario, USER1);
        {
            let mut vault = ts::take_shared<Vault<SUI>>(&scenario);
            let coin = coin::mint_for_testing<SUI>(1000, ts::ctx(&mut scenario));
            vault::deposit(&mut vault, coin, ts::ctx(&mut scenario));
            ts::return_shared(vault);
        };
        
        // Borrow, add profit, and repay
        ts::next_tx(&mut scenario, USER1);
        {
            let mut vault = ts::take_shared<Vault<SUI>>(&scenario);
            
            // Borrow 100
            let (mut borrowed_coin, promise) = vault::borrow(&mut vault, 100, ts::ctx(&mut scenario));
            
            // Simulate trading profit - add 50 more
            let profit = coin::mint_for_testing<SUI>(50, ts::ctx(&mut scenario));
            coin::join(&mut borrowed_coin, profit);
            
            // Repay 150 (original 100 + 50 profit)
            vault::repay(&mut vault, borrowed_coin, promise);
            
            // Pool should increase by the profit
            assert!(vault::get_pool_balance(&vault) == 1050, 0);
            
            ts::return_shared(vault);
        };
        
        ts::end(scenario);
    }

    #[test]
    /// Test query functions for non-existent user
    fun test_query_nonexistent_user() {
        let mut scenario = ts::begin(ADMIN);
        setup_vault(&mut scenario);
        
        ts::next_tx(&mut scenario, ADMIN);
        {
            let vault = ts::take_shared<Vault<SUI>>(&scenario);
            
            // Non-existent user should have 0 balance
            assert!(vault::get_balance(&vault, USER1) == 0, 0);
            
            ts::return_shared(vault);
        };
        
        ts::end(scenario);
    }

    #[test]
    /// Test complete withdraw (balance goes to 0)
    fun test_complete_withdraw() {
        let mut scenario = ts::begin(ADMIN);
        setup_vault(&mut scenario);
        
        // Deposit
        ts::next_tx(&mut scenario, USER1);
        {
            let mut vault = ts::take_shared<Vault<SUI>>(&scenario);
            let coin = coin::mint_for_testing<SUI>(1000, ts::ctx(&mut scenario));
            vault::deposit(&mut vault, coin, ts::ctx(&mut scenario));
            ts::return_shared(vault);
        };
        
        // Withdraw everything
        ts::next_tx(&mut scenario, USER1);
        {
            let mut vault = ts::take_shared<Vault<SUI>>(&scenario);
            let coin = vault::withdraw(&mut vault, 1000, ts::ctx(&mut scenario));
            
            assert!(vault::get_balance(&vault, USER1) == 0, 0);
            assert!(vault::get_pool_balance(&vault) == 0, 1);
            // User count stays 1 (user still exists in table with 0 balance)
            
            coin::burn_for_testing(coin);
            ts::return_shared(vault);
        };
        
        ts::end(scenario);
    }

    // ======== Negative Test Cases ========

    #[test]
    #[expected_failure(abort_code = vault::E_INSUFFICIENT_BALANCE)]
    /// Test withdrawing more than balance
    fun test_withdraw_more_than_balance() {
        let mut scenario = ts::begin(ADMIN);
        setup_vault(&mut scenario);
        
        // Deposit
        ts::next_tx(&mut scenario, USER1);
        {
            let mut vault = ts::take_shared<Vault<SUI>>(&scenario);
            let coin = coin::mint_for_testing<SUI>(1000, ts::ctx(&mut scenario));
            vault::deposit(&mut vault, coin, ts::ctx(&mut scenario));
            ts::return_shared(vault);
        };
        
        // Try to withdraw more - should fail
        ts::next_tx(&mut scenario, USER1);
        {
            let mut vault = ts::take_shared<Vault<SUI>>(&scenario);
            let coin = vault::withdraw(&mut vault, 9999, ts::ctx(&mut scenario));
            coin::burn_for_testing(coin);
            ts::return_shared(vault);
        };
        
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = vault::E_USER_NOT_FOUND)]
    /// Test withdrawing with no prior deposit
    fun test_withdraw_without_deposit() {
        let mut scenario = ts::begin(ADMIN);
        setup_vault(&mut scenario);
        
        // Try to withdraw without depositing - should fail
        ts::next_tx(&mut scenario, USER1);
        {
            let mut vault = ts::take_shared<Vault<SUI>>(&scenario);
            let coin = vault::withdraw(&mut vault, 100, ts::ctx(&mut scenario));
            coin::burn_for_testing(coin);
            ts::return_shared(vault);
        };
        
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = vault::E_INSUFFICIENT_POOL_BALANCE)]
    /// Test borrowing more than pool balance
    fun test_borrow_more_than_pool() {
        let mut scenario = ts::begin(ADMIN);
        setup_vault(&mut scenario);
        
        // Deposit small amount
        ts::next_tx(&mut scenario, USER1);
        {
            let mut vault = ts::take_shared<Vault<SUI>>(&scenario);
            let coin = coin::mint_for_testing<SUI>(100, ts::ctx(&mut scenario));
            vault::deposit(&mut vault, coin, ts::ctx(&mut scenario));
            ts::return_shared(vault);
        };
        
        // Try to borrow more - should fail
        ts::next_tx(&mut scenario, USER1);
        {
            let mut vault = ts::take_shared<Vault<SUI>>(&scenario);
            let (borrowed_coin, promise) = vault::borrow(&mut vault, 9999, ts::ctx(&mut scenario));
            vault::repay(&mut vault, borrowed_coin, promise);
            ts::return_shared(vault);
        };
        
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = vault::E_INSUFFICIENT_REPAYMENT)]
    /// Test repaying less than borrowed amount
    fun test_repay_insufficient() {
        let mut scenario = ts::begin(ADMIN);
        setup_vault(&mut scenario);
        
        // Setup vault with funds
        ts::next_tx(&mut scenario, USER1);
        {
            let mut vault = ts::take_shared<Vault<SUI>>(&scenario);
            let coin = coin::mint_for_testing<SUI>(1000, ts::ctx(&mut scenario));
            vault::deposit(&mut vault, coin, ts::ctx(&mut scenario));
            ts::return_shared(vault);
        };
        
        // Borrow and try to repay less
        ts::next_tx(&mut scenario, USER1);
        {
            let mut vault = ts::take_shared<Vault<SUI>>(&scenario);
            
            // Borrow 100
            let (mut borrowed_coin, promise) = vault::borrow(&mut vault, 100, ts::ctx(&mut scenario));
            
            // Burn some of it (simulate loss)
            let loss = coin::split(&mut borrowed_coin, 50, ts::ctx(&mut scenario));
            coin::burn_for_testing(loss);
            
            // Try to repay only 50 - should fail
            vault::repay(&mut vault, borrowed_coin, promise);
            
            ts::return_shared(vault);
        };
        
        ts::end(scenario);
    }
}
