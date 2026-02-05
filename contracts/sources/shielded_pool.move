/// Module: shielded_pool
/// 
/// Core module for Yoshino - a privacy-focused DEX aggregator on Sui
/// Implements the Internal Ledger model: Deposit → Trade → Withdraw
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

    // ======== Capability Objects ========

    /// Admin capability - held by protocol owner
    /// Can create/revoke SolverCaps, update config, and sweep dust
    public struct AdminCap has key, store {
        id: UID,
    }

    /// Solver capability - held by off-chain backend service
    /// Required to call settle_batch and withdraw_to_user
    public struct SolverCap has key, store {
        id: UID,
    }

    // ======== State Objects ========

    /// Main protocol state (shared object)
    /// Holds DeepBook Balance Manager - acts as the "Vault"
    public struct YoshinoState has key {
        id: UID,
        /// Balance Manager object - holds all deposited funds
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

        // 3. Create DeepBook Balance Manager (The Vault)
        let balance_manager = balance_manager::new(ctx);

        // 4. Create and share protocol state
        let state = YoshinoState {
            id: object::new(ctx),
            balance_manager,
            batch_count: 0,
        };

        // 5. Transfer capabilities to deployer
        transfer::public_transfer(admin_cap, ctx.sender());
        transfer::public_transfer(solver_cap, ctx.sender());
        
        // 6. Share the state object
        transfer::share_object(state);
    }

    // =========================================================
    // 1. DEPOSIT (User Action - Public but Generic)
    // =========================================================
    
    /// Users deposit funds into the Yoshino vault
    /// This is the "shielding" action - funds enter the pool
    /// The Resolver observes this transaction off-chain and tracks user balances
    /// 
    /// # Type Parameters
    /// - T: The coin type to deposit (e.g., SUI, USDC)
    /// 
    /// # Arguments
    /// - state: Yoshino protocol state
    /// - input: The coin to deposit
    public fun deposit<T>(
        state: &mut YoshinoState,
        input: Coin<T>,
        ctx: &mut TxContext
    ) {
        // Deposit the coin into the BalanceManager vault
        // The Resolver Agent observes this event and updates its private DB
        balance_manager::deposit(&mut state.balance_manager, input, ctx);
    }

    // =========================================================
    // 2. SETTLE BATCH (Resolver Action - The "Shielded" Trade)
    // =========================================================
    
    /// Execute a batch swap on DeepBook V3 using funds from the vault
    /// 
    /// This is the privacy-preserving "hero" function that:
    /// 1. Withdraws aggregated funds from the BalanceManager
    /// 2. Executes the trade on DeepBook
    /// 3. Deposits the output back into the BalanceManager
    /// 
    /// The public chain only sees "Yoshino traded X for Y" - not which users
    /// 
    /// # Type Parameters
    /// - Base: The base asset of the pool (e.g., SUI)
    /// - Quote: The quote asset of the pool (e.g., USDC)
    /// 
    /// # Arguments
    /// - _solver: Proof of authority (must hold SolverCap)
    /// - state: Yoshino protocol state
    /// - pool: DeepBook pool to trade on
    /// - clock: Sui clock for timestamps
    /// - amount_to_swap: Amount of input asset to swap
    /// - is_bid: Trade direction (true = Buy Base with Quote, false = Sell Base for Quote)
    /// - min_out: Minimum output amount (slippage protection)
    public fun settle_batch<Base, Quote>(
        _solver: &SolverCap,
        state: &mut YoshinoState,
        pool: &mut Pool<Base, Quote>,
        clock: &Clock,
        amount_to_swap: u64,
        is_bid: bool,
        min_out: u64,
        ctx: &mut TxContext
    ) {
        // Increment batch counter
        state.batch_count = state.batch_count + 1;

        // A. Withdraw from Vault
        // If is_bid (Buy Base), we need Quote to sell
        // If !is_bid (Sell Base), we need Base to sell
        let (base_in, quote_in) = if (is_bid) {
            let coin_q = balance_manager::withdraw<Quote>(&mut state.balance_manager, amount_to_swap, ctx);
            (coin::zero<Base>(ctx), coin_q)
        } else {
            let coin_b = balance_manager::withdraw<Base>(&mut state.balance_manager, amount_to_swap, ctx);
            (coin_b, coin::zero<Quote>(ctx))
        };
        
        // Zero DEEP for now (fees handled separately or via BalanceManager trade cap)
        let deep_in = coin::zero<DEEP>(ctx);

        // B. Execute Trade on DeepBook
        let (base_out, quote_out, deep_out) = pool::swap_exact_quantity(
            pool,
            base_in,
            quote_in,
            deep_in,
            min_out,
            clock,
            ctx
        );

        // Calculate output for event logging
        let out_val = if (is_bid) { 
            coin::value(&base_out) 
        } else { 
            coin::value(&quote_out) 
        };

        // Verify slippage protection
        assert!(out_val >= min_out, ESlippageExceeded);

        // C. Deposit Results back to Vault
        balance_manager::deposit(&mut state.balance_manager, base_out, ctx);
        balance_manager::deposit(&mut state.balance_manager, quote_out, ctx);
        balance_manager::deposit(&mut state.balance_manager, deep_out, ctx);

        // D. Emit event for off-chain indexing
        let timestamp = clock::timestamp_ms(clock);
        events::emit_batch_settled(
            state.batch_count,
            object::id(pool),
            is_bid,
            amount_to_swap,
            out_val,
            timestamp,
        );
    }

    // =========================================================
    // 3. WITHDRAW (Resolver Action - Settlement)
    // =========================================================
    
    /// Withdraw funds from the vault to a user
    /// 
    /// The Resolver calls this function to settle trades and return funds to users
    /// The Resolver's off-chain database tracks who should receive what
    /// 
    /// # Type Parameters
    /// - T: The coin type to withdraw
    /// 
    /// # Arguments
    /// - _solver: Proof of authority (must hold SolverCap)
    /// - state: Yoshino protocol state
    /// - amount: Amount to withdraw
    /// - recipient: Address to receive the funds
    public fun withdraw_to_user<T>(
        _solver: &SolverCap,
        state: &mut YoshinoState,
        amount: u64,
        recipient: address,
        ctx: &mut TxContext
    ) {
        let out = balance_manager::withdraw<T>(&mut state.balance_manager, amount, ctx);
        transfer::public_transfer(out, recipient);
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
        object::id(&state.balance_manager)
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
