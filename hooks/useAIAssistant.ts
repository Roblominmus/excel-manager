'use client';

import { useState } from 'react';
import { AIResponse } from '@/types/ai';

export function useAIAssistant() {
  const [loading, setLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState<AIResponse | null>(null);

  const askAI = async (query: string, headers: string[], rows: unknown[][]) => {
    setLoading(true);

    try {
      // Call the API route with full data
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, headers, rows }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API request failed with status ${response.status}`);
      }

      const data: AIResponse = await response.json();
      setLastResponse(data);
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to contact AI service';
      const errorResponse: AIResponse = {
        success: false,
        type: 'error',
        error: errorMessage,
      };
      setLastResponse(errorResponse);
      return errorResponse;
    } finally {
      setLoading(false);
    }
  };

  return {
    askAI,
    loading,
    lastResponse,
  };
}
