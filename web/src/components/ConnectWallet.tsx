'use client';

import { useCurrentAccount, useDisconnectWallet, ConnectButton } from '@mysten/dapp-kit';

export function ConnectWallet() {
  const account = useCurrentAccount();
  const { mutate: disconnect } = useDisconnectWallet();
  
  if (account) {
    return (
      <button
        onClick={() => disconnect()}
        className="px-4 py-2 bg-white/80 text-[#E23FB9] rounded-xl hover:bg-white transition-all duration-300 font-medium text-sm shadow-sm border border-[#E23FB9]/20"
      >
        Disconnect
      </button>
    );
  }
  
  return (
    <ConnectButton 
      className="!bg-[#E23FB9] !text-white !px-4 !py-2 !rounded-xl !font-medium !text-sm hover:!bg-[#E23FB9]/90 !transition-all !duration-300 !shadow-lg !shadow-[#E23FB9]/20"
    />
  );
}
