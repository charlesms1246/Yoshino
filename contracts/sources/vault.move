/// Module: vault
/// 
/// Core vault contract implementing internal ledger and hot potato pattern
/// This module demonstrates the fundamental patterns for managing pooled assets
/// with explicit balance tracking and secure borrowing mechanisms.
module yoshino::vault {
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};
    use sui::table::{Self, Table};
    use sui::event;

    // ======== Error Codes ========

    const E_INSUFFICIENT_BALANCE: u64 = 0;
    const E_VAULT_MISMATCH: u64 = 2;
    const E_INSUFFICIENT_POOL_BALANCE: u64 = 3;
    const E_USER_NOT_FOUND: u64 = 4;
    const E_INSUFFICIENT_REPAYMENT: u64 = 5;

    // ======== Structs ========

    /// The main vault holding pooled assets
    public struct Vault<phantom T> has key {
        id: UID,
        /// Total pooled balance
        pool: Balance<T>,
        /// Internal ledger: user address -> their balance
        ledger: Table<address, u64>,
        /// Total users in the vault
        user_count: u64,
    }

    /// Admin capability for vault creation
    public struct AdminCap has key, store {
        id: UID,
    }

    /// Hot potato - must be consumed in same transaction
    /// This ensures borrowed funds are always returned
    public struct Promise {
        vault_id: ID,
        borrowed_amount: u64,
    }

    // ======== Events ========

    public struct DepositEvent has copy, drop {
        user: address,
        amount: u64,
        new_balance: u64,
    }

    public struct WithdrawEvent has copy, drop {
        user: address,
        amount: u64,
        remaining_balance: u64,
    }

    public struct BorrowEvent has copy, drop {
        vault_id: ID,
        amount: u64,
    }

    public struct RepayEvent has copy, drop {
        vault_id: ID,
        amount: u64,
    }

    // ======== Init Function ========

    /// Initialize the vault module
    /// Creates admin capability and transfers to deployer
    fun init(ctx: &mut TxContext) {
        // Create admin capability
        let admin_cap = AdminCap {
            id: object::new(ctx),
        };
        // Send to transaction sender
        transfer::transfer(admin_cap, ctx.sender());
    }

    // ======== Vault Management ========

    /// Create a new vault for a specific coin type
    /// Only the AdminCap holder can create vaults
    public fun create_vault<T>(
        _admin: &AdminCap,
        ctx: &mut TxContext
    ) {
        let vault = Vault<T> {
            id: object::new(ctx),
            pool: balance::zero<T>(),
            ledger: table::new(ctx),
            user_count: 0,
        };
        // Share the vault object for concurrent access
        transfer::share_object(vault);
    }

    // ======== User Functions ========

    /// Deposit coins into the vault
    /// User's balance is tracked in the internal ledger
    public fun deposit<T>(
        vault: &mut Vault<T>,
        payment: Coin<T>,
        ctx: &mut TxContext
    ) {
        // 1. Get user address
        let user = ctx.sender();
        
        // 2. Get coin amount
        let amount = coin::value(&payment);
        
        // 3. Add to pool balance
        let coin_balance = coin::into_balance(payment);
        balance::join(&mut vault.pool, coin_balance);
        
        // 4. Update user's ledger entry
        if (!table::contains(&vault.ledger, user)) {
            table::add(&mut vault.ledger, user, amount);
            vault.user_count = vault.user_count + 1;
        } else {
            let user_balance = table::borrow_mut(&mut vault.ledger, user);
            *user_balance = *user_balance + amount;
        };
        
        // 5. Emit DepositEvent
        let new_balance = *table::borrow(&vault.ledger, user);
        event::emit(DepositEvent {
            user,
            amount,
            new_balance,
        });
    }

    /// Withdraw coins from the vault
    /// Deducts from user's ledger balance and returns coins
    public fun withdraw<T>(
        vault: &mut Vault<T>,
        amount: u64,
        ctx: &mut TxContext
    ): Coin<T> {
        // 1. Get user address
        let user = ctx.sender();
        
        // 2. Check user has sufficient balance in ledger
        assert!(table::contains(&vault.ledger, user), E_USER_NOT_FOUND);
        let user_balance = table::borrow_mut(&mut vault.ledger, user);
        assert!(*user_balance >= amount, E_INSUFFICIENT_BALANCE);
        
        // 3. Deduct from ledger
        *user_balance = *user_balance - amount;
        
        // 4. Take from pool balance
        let withdrawn_balance = balance::split(&mut vault.pool, amount);
        
        // 5. Emit WithdrawEvent
        event::emit(WithdrawEvent {
            user,
            amount,
            remaining_balance: *user_balance,
        });
        
        // 6. Return coin to user
        coin::from_balance(withdrawn_balance, ctx)
    }

    // ======== Query Functions ========

    /// Get a user's balance in the vault
    public fun get_balance<T>(
        vault: &Vault<T>,
        user: address
    ): u64 {
        if (table::contains(&vault.ledger, user)) {
            *table::borrow(&vault.ledger, user)
        } else {
            0
        }
    }

    /// Get total pool balance
    public fun get_pool_balance<T>(
        vault: &Vault<T>
    ): u64 {
        balance::value(&vault.pool)
    }

    /// Get total user count
    public fun get_user_count<T>(
        vault: &Vault<T>
    ): u64 {
        vault.user_count
    }

    // ======== Hot Potato Pattern ========

    /// Borrow funds from vault - returns coin and a Promise
    /// The Promise MUST be consumed by calling repay() in the same transaction
    /// This pattern ensures borrowed funds cannot be stolen
    public fun borrow<T>(
        vault: &mut Vault<T>,
        amount: u64,
        ctx: &mut TxContext
    ): (Coin<T>, Promise) {
        // 1. Verify sufficient pool balance
        assert!(balance::value(&vault.pool) >= amount, E_INSUFFICIENT_POOL_BALANCE);
        
        // 2. Take amount from pool
        let borrowed_balance = balance::split(&mut vault.pool, amount);
        let borrowed_coin = coin::from_balance(borrowed_balance, ctx);
        
        // 3. Create Promise with vault ID and amount
        let promise = Promise {
            vault_id: object::uid_to_inner(&vault.id),
            borrowed_amount: amount,
        };
        
        // 4. Emit BorrowEvent
        event::emit(BorrowEvent {
            vault_id: object::uid_to_inner(&vault.id),
            amount,
        });
        
        // 5. Return both coin and promise
        (borrowed_coin, promise)
    }

    /// Repay borrowed funds - consumes the Promise (hot potato)
    /// Must be called in the same transaction as borrow()
    public fun repay<T>(
        vault: &mut Vault<T>,
        payment: Coin<T>,
        promise: Promise
    ) {
        let Promise { vault_id, borrowed_amount } = promise;
        
        // 1. Verify promise.vault_id matches vault
        assert!(vault_id == object::uid_to_inner(&vault.id), E_VAULT_MISMATCH);
        
        // 2. Verify payment amount >= promise.borrowed_amount
        let payment_amount = coin::value(&payment);
        assert!(payment_amount >= borrowed_amount, E_INSUFFICIENT_REPAYMENT);
        
        // 3. Add payment back to pool
        let payment_balance = coin::into_balance(payment);
        balance::join(&mut vault.pool, payment_balance);
        
        // 4. Emit RepayEvent
        event::emit(RepayEvent {
            vault_id,
            amount: payment_amount,
        });
        
        // 5. Promise is automatically destroyed (hot potato consumed)
    }

    // ======== Test-only Functions ========

    #[test_only]
    /// Test-only init function for unit tests
    public fun test_init(ctx: &mut TxContext) {
        init(ctx);
    }
}
