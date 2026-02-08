import { useState } from 'react';
import { useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import type { UserIntent, ApiResponse } from '@/types';

const RESOLVER_API_URL = process.env.NEXT_PUBLIC_RESOLVER_API || 'http://localhost:3000';

export function useSubmitIntent() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const client = useSuiClient();

  const submitIntent = async (intent: UserIntent) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Step 1: Submit intent to resolver API for encryption
      const response = await fetch(`${RESOLVER_API_URL}/api/intents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(intent),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const apiResponse: ApiResponse<any> = await response.json();

      if (!apiResponse.success || !apiResponse.data) {
        throw new Error(apiResponse.error || 'Failed to submit intent');
      }

      return {
        success: true,
        message: 'Intent submitted successfully',
        data: apiResponse.data,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit intent';
      console.error('Intent submission error:', err);
      setError(errorMessage);
      
      return {
        success: false,
        message: errorMessage,
      };
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    submitIntent,
    isSubmitting,
    error,
  };
}

