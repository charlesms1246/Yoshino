module yoshino::events {
    use sui::event;
    use std::type_name::TypeName;

    public struct BatchSettled has copy, drop {
        batch_id: u64,
        pool_id: ID,
        is_buy: bool,
        input_amount: u64,
        output_amount: u64,
        timestamp: u64,
    }
    
    public struct DepositEvent has copy, drop {
        user: address,
        amount: u64,
        coin_type: TypeName,
    }
    
    public struct WithdrawalEvent has copy, drop {
        user: address,
        amount: u64,
        coin_type: TypeName,
    }

    public fun emit_batch_settled(
        batch_id: u64,
        pool_id: ID,
        is_buy: bool,
        input_amount: u64,
        output_amount: u64,
        timestamp: u64,
    ) {
        event::emit(BatchSettled {
            batch_id,
            pool_id,
            is_buy,
            input_amount,
            output_amount,
            timestamp,
        });
    }
    
    public fun emit_deposit_event(user: address, amount: u64, coin_type: TypeName) {
        event::emit(DepositEvent {
            user,
            amount,
            coin_type,
        });
    }
    
    public fun emit_withdrawal_event(user: address, amount: u64, coin_type: TypeName) {
        event::emit(WithdrawalEvent {
            user,
            amount,
            coin_type,
        });
    }
}
