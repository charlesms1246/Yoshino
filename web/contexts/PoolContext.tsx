'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface PoolContextType {
  selectedPool: string;
  setSelectedPool: (pool: string) => void;
}

const PoolContext = createContext<PoolContextType | undefined>(undefined);

export function PoolProvider({ children }: { children: ReactNode }) {
  const [selectedPool, setSelectedPool] = useState('SUI_DBUSDC'); // Updated to actual testnet pool

  return (
    <PoolContext.Provider value={{ selectedPool, setSelectedPool }}>
      {children}
    </PoolContext.Provider>
  );
}

export function usePool() {
  const context = useContext(PoolContext);
  if (context === undefined) {
    throw new Error('usePool must be used within a PoolProvider');
  }
  return context;
}
