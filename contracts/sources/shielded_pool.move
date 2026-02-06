module yoshino::shielded_pool {
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};
    use sui::bag::{Self, Bag};
    use sui::table::{Self, Table};
    use std::type_name::{Self, TypeName};
    use yoshino::events;

    const EInsufficientBalance: u64 = 2;

    public struct AdminCap has key, store {
        id: UID,
    }

    public struct SolverCap has key, store {
        id: UID,
    }

    /// YoshinoState: The Smart Vault
    /// Holds user deposits directly - NO BalanceManager here
    public struct YoshinoState has key {
        id: UID,
        /// Maps user address -> Bag of Balance<T> for any coin type
        user_assets: Table<address, Bag>,
        batch_count: u64,
    }

    fun init(ctx: &mut TxContext) {
        let admin_cap = AdminCap { id: object::new(ctx) };
        let solver_cap = SolverCap { id: object::new(ctx) };
        
        let state = YoshinoState {
            id: object::new(ctx),
            user_assets: table::new(ctx),
            batch_count: 0,
        };
        
        transfer::public_transfer(admin_cap, ctx.sender());
        transfer::public_transfer(solver_cap, ctx.sender());
        transfer::share_object(state);
    }

    /// Deposit: Users put coins into the vault
    /// Completely internal - no DeepBook involved
    public fun deposit<T>(
        state: &mut YoshinoState,
        input: Coin<T>,
        ctx: &mut TxContext
    ) {
        let sender = ctx.sender();
        let amount = coin::value(&input);
        
        // Initialize user's bag if missing
        if (!table::contains(&state.user_assets, sender)) {
            table::add(&mut state.user_assets, sender, bag::new(ctx));
        };
        
        let user_bag = table::borrow_mut(&mut state.user_assets, sender);
        let coin_type = type_name::get<T>();
        
        // Store as Balance<T> for easy merging
        if (!bag::contains_with_type<TypeName, Balance<T>>(user_bag, coin_type)) {
            bag::add(user_bag, coin_type, coin::into_balance(input));
        } else {
            let existing_balance = bag::borrow_mut<TypeName, Balance<T>>(user_bag, coin_type);
            balance::join(existing_balance, coin::into_balance(input));
        };
        
        events::emit_deposit_event(sender, amount, coin_type);
    }

    /// Withdraw: Solver returns funds to user
    /// Takes from internal storage and sends to user's wallet
    public fun withdraw_to_user<T>(
        _solver: &SolverCap,
        state: &mut YoshinoState,
        amount: u64,
        recipient: address,
        ctx: &mut TxContext
    ) {
        let coin_type = type_name::get<T>();
        
        assert!(table::contains(&state.user_assets, recipient), EInsufficientBalance);
        let user_bag = table::borrow_mut(&mut state.user_assets, recipient);
        assert!(bag::contains_with_type<TypeName, Balance<T>>(user_bag, coin_type), EInsufficientBalance);
        
        let user_balance = bag::borrow_mut<TypeName, Balance<T>>(user_bag, coin_type);
        assert!(balance::value(user_balance) >= amount, EInsufficientBalance);
        
        // Split the balance and convert to coin
        let withdrawn_balance = balance::split(user_balance, amount);
        let coin_out = coin::from_balance(withdrawn_balance, ctx);
        
        transfer::public_transfer(coin_out, recipient);
        events::emit_withdrawal_event(recipient, amount, coin_type);
    }

    /// Batch Settlement: Process multiple user withdrawals atomically
    /// This is Phase 1: Simple batch withdrawals (no trading yet)
    /// Phase 2 will add DeepBook integration for actual order matching
    public entry fun settle_batch<T>(
        _solver: &SolverCap,
        state: &mut YoshinoState,
        recipients: vector<address>,
        amounts: vector<u64>,
        ctx: &mut TxContext
    ) {
        use std::vector;
        
        let len = vector::length(&recipients);
        assert!(len == vector::length(&amounts), 1); // ELengthMismatch
        assert!(len > 0, 2); // EEmptyBatch
        
        let coin_type = type_name::get<T>();
        let mut i = 0;
        
        // Process each withdrawal atomically
        while (i < len) {
            let recipient = *vector::borrow(&recipients, i);
            let amount = *vector::borrow(&amounts, i);
            
            if (table::contains(&state.user_assets, recipient)) {
                let user_bag = table::borrow_mut(&mut state.user_assets, recipient);
                
                if (bag::contains_with_type<TypeName, Balance<T>>(user_bag, coin_type)) {
                    let user_balance = bag::borrow_mut<TypeName, Balance<T>>(user_bag, coin_type);
                    
                    if (balance::value(user_balance) >= amount) {
                        let withdrawn_balance = balance::split(user_balance, amount);
                        let coin_out = coin::from_balance(withdrawn_balance, ctx);
                        transfer::public_transfer(coin_out, recipient);
                        events::emit_withdrawal_event(recipient, amount, coin_type);
                    };
                };
            };
            
            i = i + 1;
        };
        
        // Increment batch counter
        state.batch_count = state.batch_count + 1;
    }

    /// Admin function: mint new solver capability
    public fun mint_solver_cap(
        _admin: &AdminCap,
        recipient: address,
        ctx: &mut TxContext
    ) {
        transfer::public_transfer(SolverCap { id: object::new(ctx) }, recipient);
    }

    /// View function: get user's balance for a specific coin type
    public fun get_user_balance<CoinType>(
        state: &YoshinoState,
        user: address
    ): u64 {
        let coin_type = type_name::get<CoinType>();
        
        if (!table::contains(&state.user_assets, user)) {
            return 0
        };
        
        let user_bag = table::borrow(&state.user_assets, user);
        if (!bag::contains_with_type<TypeName, Balance<CoinType>>(user_bag, coin_type)) {
            return 0
        };
        
        let user_balance = bag::borrow<TypeName, Balance<CoinType>>(user_bag, coin_type);
        balance::value(user_balance)
    }

    public fun get_batch_count(state: &YoshinoState): u64 {
        state.batch_count
    }

    #[test_only]
    public fun test_init(ctx: &mut TxContext) {
        init(ctx);
    }
}
