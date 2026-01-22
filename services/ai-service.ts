/**
 * AI Service - The Waterfall
 * 
 * This service implements a robust waterfall pattern for AI API calls.
 * It tries providers in sequence: DeepSeek → Cohere → Groq → X.AI
 * If one fails (rate limit, error, timeout), it automatically retries with the next.
 * 
 * SECURITY: This service NEVER receives actual spreadsheet row data.
 * It only receives column headers/schema and user queries.
 */

import { AIRequest, AIResponse, SpreadsheetSchema } from '@/types/ai';
import { makeDeepSeekRequest } from './providers/deepseek';
import { makeCohereRequest } from './providers/cohere';
import { makeGroqRequest } from './providers/groq';
import { makeXAIRequest } from './providers/xai';

/**
 * Provider configuration in priority order
 */
const PROVIDERS = [
  { name: 'Groq', handler: makeGroqRequest },
  { name: 'DeepSeek', handler: makeDeepSeekRequest },
  { name: 'X.AI', handler: makeXAIRequest },
  { name: 'Cohere', handler: makeCohereRequest },
];

/**
 * Main AI request function with waterfall fallback
 */
export async function makeAIRequest(
  query: string,
  schema: SpreadsheetSchema
): Promise<AIResponse> {
  const errors: string[] = [];

  // Try each provider in sequence
  for (const provider of PROVIDERS) {
    try {
      console.log(`[AI Waterfall] Attempting ${provider.name}...`);
      
      const response = await provider.handler(query, schema);
      
      // If successful, return immediately
      if (response.success) {
        console.log(`[AI Waterfall] ✓ Success with ${provider.name}`);
        return response;
      }
      
      // If not successful, log and continue to next provider
      console.log(`[AI Waterfall] ✗ ${provider.name} failed: ${response.error}`);
      errors.push(`${provider.name}: ${response.error}`);
      
    } catch (error: any) {
      console.error(`[AI Waterfall] ✗ ${provider.name} exception:`, error);
      errors.push(`${provider.name}: ${error.message}`);
    }
  }

  // All providers failed
  console.error('[AI Waterfall] All providers exhausted');
  return {
    success: false,
    type: 'error',
    error: 'All AI providers failed. Errors: ' + errors.join(' | '),
  };
}

/**
 * Validate that the spreadsheet schema contains no actual data
 * This is a safety check to enforce the security constraint
 */
export function validateSchemaOnly(schema: SpreadsheetSchema): boolean {
  // Ensure we only have headers and types, no actual row data
  if (!schema.headers || schema.headers.length === 0) {
    return false;
  }
  
  // If sampleData exists, it should only be one row (for type inference)
  if (schema.sampleData && schema.sampleData.length > 1) {
    console.warn('[Security] Schema contains multiple rows of data!');
    return false;
  }
  
  return true;
}

/**
 * Extract schema from spreadsheet data WITHOUT including actual data
 */
export function extractSchema(
  headers: string[],
  firstRow?: any[]
): SpreadsheetSchema {
  const columnTypes: Record<string, string> = {};
  
  // Infer types from first row (if provided)
  if (firstRow) {
    headers.forEach((header, index) => {
      const value = firstRow[index];
      columnTypes[header] = typeof value;
    });
  } else {
    // Default to string if no sample provided
    headers.forEach(header => {
      columnTypes[header] = 'string';
    });
  }
  
  return {
    headers,
    columnTypes,
    sampleData: firstRow ? firstRow.map(v => typeof v) : undefined,
  };
}
