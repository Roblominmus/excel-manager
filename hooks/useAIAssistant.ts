'use client';

import { useState } from 'react';
import { makeAIRequest, extractSchema } from '@/services/ai-service';
import { AIResponse, SpreadsheetSchema } from '@/types/ai';

export function useAIAssistant() {
  const [loading, setLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState<AIResponse | null>(null);

  const askAI = async (query: string, headers: string[], firstRow?: any[]) => {
    setLoading(true);

    try {
      // Extract schema WITHOUT actual data (security constraint)
      const schema: SpreadsheetSchema = extractSchema(headers, firstRow);

      // Make AI request with waterfall fallback
      const response = await makeAIRequest(query, schema);
      
      setLastResponse(response);
      return response;
    } catch (error: any) {
      const errorResponse: AIResponse = {
        success: false,
        type: 'error',
        error: error.message || 'Failed to contact AI service',
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
