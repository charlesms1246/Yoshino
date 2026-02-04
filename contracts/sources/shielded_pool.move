/// Module: shielded_pool
/// 
/// Core module for Yoshino - a privacy-focused DEX aggregator on Sui
/// Acts as a "Passthrough Authority" for DeepBook V3 trading
module yoshino::shielded_pool {
    use sui::clock::{Self, Clock};
    use sui::coin::{Self, Coin};
    use deepbook::balance_manager::{Self, BalanceManager};
    use deepbook::pool::{Self, Pool};
    use token::deep::DEEP;
    use yoshino::events;

    // ======== Error Codes ========

    #[allow(unused_const)]
    /// Caller doesn't have SolverCap authority
    const ENotAuthorized: u64 = 0;
    /// Output amount is below minimum (slippage exceeded)
    const ESlippageExceeded: u64 = 1;
    #[allow(unused_const)]
    /// Interacting with wrong pool
    const EInvalidPool: u64 = 2;

    // ======== Capability Objects ========

    /// Admin capability - held by protocol owner
    /// Can create/revoke SolverCaps, update config, and sweep dust
    public struct AdminCap has key, store {
        id: UID,
    }

    /// Solver capability - held by off-chain backend service
    /// Required to call settle_batch
    public struct SolverCap has key, store {
        id: UID,
    }

    // ======== State Objects ========

    /// Main protocol state (shared object)
    /// Holds DeepBook Balance Manager and trading capabilities
    public struct YoshinoState has key {
        id: UID,
        /// ID of the DeepBook Balance Manager
        balance_manager_id: ID,
        /// Balance Manager object itself
        balance_manager: BalanceManager,
        /// Sequential counter for batch IDs
        batch_count: u64,
    }

    // ======== Init Function ========

    /// Initialize the Yoshino protocol
    /// Creates AdminCap, SolverCap, and YoshinoState
    fun init(ctx: &mut TxContext) {
        // 1. Create Admin Capability
        let admin_cap = AdminCap {
            id: object::new(ctx),
        };

        // 2. Create initial Solver Capability
        let solver_cap = SolverCap {
            id: object::new(ctx),
        };

        // 3. Create DeepBook Balance Manager for Yoshino
        let balance_manager = balance_manager::new(ctx);
        let balance_manager_id = object::id(&balance_manager);

        // 4. Create and share protocol state
        let state = YoshinoState {
            id: object::new(ctx),
            balance_manager_id,
            balance_manager,
            batch_count: 0,
        };

        // 5. Transfer capabilities to deployer
        transfer::public_transfer(admin_cap, ctx.sender());
        transfer::public_transfer(solver_cap, ctx.sender());
        
        // 6. Share the state object
        transfer::share_object(state);
    }

    // ======== Core Trading Functions ========

    /// Execute a batch swap on DeepBook V3
    /// 
    /// This is the "hero" function that:
    /// 1. Calls DeepBook's swap_exact_quantity function directly
    /// 2. Verifies slippage protection
    /// 3. Returns output coin to PTB for distribution
    /// 
    /// # Type Parameters
    /// - BaseAsset: The base asset of the pool (e.g., SUI)
    /// - QuoteAsset: The quote asset of the pool (e.g., DBUSDC)
    /// 
    /// # Arguments
    /// - _solver: Proof of authority (must hold SolverCap)
    /// - state: Yoshino protocol state
    /// - pool: DeepBook pool to trade on
    /// - clock: Sui clock for timestamps
    /// - base_in: Base asset coins (set value to 0 if selling quote for base)
    /// - quote_in: Quote asset coins (set value to 0 if selling base for quote)
    /// - deep_in: DEEP tokens to pay trading fees
    /// - min_out: Minimum output amount (slippage protection)
    /// 
    /// # Returns
    /// - (Coin<BaseAsset>, Coin<QuoteAsset>, Coin<DEEP>): Output coins from the swap
    public fun settle_batch<BaseAsset, QuoteAsset>(
        _solver: &SolverCap,
        state: &mut YoshinoState,
        pool: &mut Pool<BaseAsset, QuoteAsset>,
        clock: &Clock,
        base_in: Coin<BaseAsset>,
        quote_in: Coin<QuoteAsset>,
        deep_in: Coin<DEEP>,
        min_out: u64,
        ctx: &mut TxContext,
    ): (Coin<BaseAsset>, Coin<QuoteAsset>, Coin<DEEP>) {
        // Increment batch counter
        state.batch_count = state.batch_count + 1;
        let batch_id = state.batch_count;

        let base_value = coin::value(&base_in);
        let quote_value = coin::value(&quote_in);
        let pool_id = object::id(pool);
        
        // Determine trade direction
        let is_bid = quote_value > 0;
        let input_amount = if (is_bid) { quote_value } else { base_value };

        // Execute swap on DeepBook using swap_exact_quantity
        let (base_out, quote_out, deep_out) = pool::swap_exact_quantity(
            pool,
            base_in,
            quote_in,
            deep_in,
            min_out,
            clock,
            ctx
        );

        // Get output amounts
        let base_out_value = coin::value(&base_out);
        let quote_out_value = coin::value(&quote_out);
        let output_amount = if (is_bid) { base_out_value } else { quote_out_value };

        // Verify slippage protection
        assert!(output_amount >= min_out, ESlippageExceeded);

        // Emit event
        let timestamp = clock::timestamp_ms(clock);
        events::emit_batch_settled(
            batch_id,
            pool_id,
            is_bid,
            input_amount,
            output_amount,
            timestamp,
        );

        // Return all coins to PTB for distribution
        (base_out, quote_out, deep_out)
    }

    // ======== Admin Functions ========

    /// Create a new Solver Capability and transfer to recipient
    /// Only callable by AdminCap holder
    public fun mint_solver_cap(
        _admin: &AdminCap,
        recipient: address,
        ctx: &mut TxContext
    ) {
        let new_solver_cap = SolverCap {
            id: object::new(ctx),
        };
        transfer::public_transfer(new_solver_cap, recipient);
    }

    /// Withdraw accumulated dust/fees from Balance Manager
    /// Only callable by AdminCap holder
    public fun withdraw_balance<CoinType>(
        _admin: &AdminCap,
        state: &mut YoshinoState,
        amount: u64,
        ctx: &mut TxContext
    ): Coin<CoinType> {
        balance_manager::withdraw(&mut state.balance_manager, amount, ctx)
    }

    // ======== View Functions ========

    /// Get the current batch count
    public fun get_batch_count(state: &YoshinoState): u64 {
        state.batch_count
    }

    /// Get the Balance Manager ID
    public fun get_balance_manager_id(state: &YoshinoState): ID {
        state.balance_manager_id
    }

    /// Get available balance in the Balance Manager  
    public fun get_balance<CoinType>(state: &YoshinoState): u64 {
        balance_manager::balance<CoinType>(&state.balance_manager)
    }

    // ======== Test-only Functions ========

    #[test_only]
    /// Test-only init function for unit tests
    public fun test_init(ctx: &mut TxContext) {
        init(ctx);
    }
}
