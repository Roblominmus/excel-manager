/**
 * AI Waterfall Service - Smart Retry Logic
 * 
 * This service implements a robust waterfall/fallback pattern for AI API calls.
 * Priority order: Groq (fastest) → DeepSeek (best logic) → X.AI → Cohere
 * 
 * PRIVACY-FIRST ARCHITECTURE:
 * ===========================
 * This service NEVER receives actual spreadsheet data.
 * It only receives:
 * 1. Column headers (e.g., "Cost", "Revenue", "Profit")
 * 2. User's natural language request (e.g., "Calculate profit margin")
 * 
 * The LLM returns either:
 * - An Excel formula (e.g., "=(B2-A2)/B2")
 * - A JavaScript transformation function
 * 
 * The frontend applies this formula to the actual data locally.
 */

import { AIRequest, AIResponse, SpreadsheetSchema } from '@/types/ai';
import { makeGroqRequest } from '@/services/providers/groq';
import { makeDeepSeekRequest } from '@/services/providers/deepseek';
import { makeXAIRequest } from '@/services/providers/xai';
import { makeCohereRequest } from '@/services/providers/cohere';

/**
 * Provider configuration in priority order (fastest to most capable)
 */
const PROVIDERS = [
  { 
    name: 'Groq', 
    handler: makeGroqRequest,
    description: 'Fastest response time'
  },
  { 
    name: 'DeepSeek', 
    handler: makeDeepSeekRequest,
    description: 'Best logical reasoning'
  },
  { 
    name: 'X.AI', 
    handler: makeXAIRequest,
    description: 'Good balance'
  },
  { 
    name: 'Cohere', 
    handler: makeCohereRequest,
    description: 'Fallback option'
  },
] as const;

/**
 * Retry configuration
 */
const RETRY_CONFIG = {
  maxAttempts: 1, // No retries per provider (move to next instead)
  timeout: 15000, // 15 second timeout per request
};

/**
 * Error codes that should trigger immediate fallback to next provider
 */
const FALLBACK_ERROR_CODES = [
  429, // Rate limit
  503, // Service unavailable
  504, // Gateway timeout
  500, // Internal server error
  502, // Bad gateway
];

/**
 * Main AI request function with intelligent waterfall fallback
 */
export async function makeAIRequestWithFallback(
  query: string,
  schema: SpreadsheetSchema
): Promise<AIResponse> {
  // Security check: Ensure we're only sending schema, not data
  if (!validateSchemaOnly(schema)) {
    return {
      success: false,
      type: 'error',
      error: 'Security violation: Schema contains actual data rows',
    };
  }

  const attemptLog: Array<{ provider: string; error: string; duration: number }> = [];
  let totalDuration = 0;

  // Try each provider in sequence
  for (const provider of PROVIDERS) {
    const startTime = Date.now();
    
    try {
      console.log(`[AI Waterfall] 🚀 Trying ${provider.name} (${provider.description})...`);
      
      // Execute request with timeout
      const response = await executeWithTimeout(
        provider.handler(query, schema),
        RETRY_CONFIG.timeout,
        provider.name
      );
      
      const duration = Date.now() - startTime;
      totalDuration += duration;
      
      // If successful, return immediately
      if (response.success) {
        console.log(
          `[AI Waterfall] ✅ Success with ${provider.name} in ${duration}ms`
        );
        return {
          ...response,
          provider: provider.name,
        };
      }
      
      // Log failure and continue to next provider
      console.log(
        `[AI Waterfall] ⚠️  ${provider.name} failed: ${response.error} (${duration}ms)`
      );
      attemptLog.push({
        provider: provider.name,
        error: response.error || 'Unknown error',
        duration,
      });
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      totalDuration += duration;
      
      const errorMessage = error.message || 'Unknown exception';
      console.error(
        `[AI Waterfall] ❌ ${provider.name} exception: ${errorMessage} (${duration}ms)`
      );
      
      attemptLog.push({
        provider: provider.name,
        error: errorMessage,
        duration,
      });
      
      // Check if error should trigger immediate fallback
      if (shouldFallback(error)) {
        console.log(`[AI Waterfall] ⏭️  Falling back to next provider...`);
        continue;
      }
    }
  }

  // All providers failed
  console.error(
    `[AI Waterfall] ⛔ All providers exhausted after ${totalDuration}ms`
  );
  console.error('[AI Waterfall] Attempt log:', attemptLog);

  return {
    success: false,
    type: 'error',
    error: generateFailureMessage(attemptLog),
  };
}

/**
 * Execute a promise with a timeout
 */
function executeWithTimeout<T>(
  promise: Promise<T>,
  timeout: number,
  providerName: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${providerName} request timeout after ${timeout}ms`)),
        timeout
      )
    ),
  ]);
}

/**
 * Determine if an error should trigger immediate fallback
 */
function shouldFallback(error: any): boolean {
  // Check for HTTP error codes
  if (error.status && FALLBACK_ERROR_CODES.includes(error.status)) {
    return true;
  }
  
  // Check for specific error messages
  const errorMessage = error.message?.toLowerCase() || '';
  if (
    errorMessage.includes('rate limit') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('unavailable') ||
    errorMessage.includes('quota')
  ) {
    return true;
  }
  
  return false;
}

/**
 * Validate that the schema contains no actual data
 * This is a CRITICAL security check
 */
function validateSchemaOnly(schema: SpreadsheetSchema): boolean {
  // Ensure we only have headers
  if (!schema.headers || schema.headers.length === 0) {
    console.error('[Security] Schema missing headers');
    return false;
  }
  
  // If sampleData exists, it should only be for type inference (max 1 row)
  if (schema.sampleData && schema.sampleData.length > 1) {
    console.error('[Security] ⚠️  Schema contains multiple rows of actual data!');
    return false;
  }
  
  return true;
}

/**
 * Generate a user-friendly error message from attempt log
 */
function generateFailureMessage(
  attemptLog: Array<{ provider: string; error: string; duration: number }>
): string {
  const summary = attemptLog
    .map((attempt) => `${attempt.provider}: ${attempt.error}`)
    .join(' | ');
  
  return `All AI providers failed. ${summary}`;
}

/**
 * Extract schema from spreadsheet data WITHOUT including actual data
 * This ensures we never send sensitive information to the AI
 */
export function extractSafeSchema(
  headers: string[],
  firstRow?: any[]
): SpreadsheetSchema {
  const columnTypes: Record<string, string> = {};
  
  // Infer types from first row (if provided) but don't include the values
  if (firstRow) {
    headers.forEach((header, index) => {
      const value = firstRow[index];
      columnTypes[header] = inferType(value);
    });
  } else {
    // Default all to string if no sample provided
    headers.forEach((header) => {
      columnTypes[header] = 'string';
    });
  }
  
  return {
    headers,
    columnTypes,
    // Do NOT include actual data
  };
}

/**
 * Infer data type from a value
 */
function inferType(value: any): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (value instanceof Date) return 'date';
  if (typeof value === 'string') {
    // Check if it's a date string
    if (!isNaN(Date.parse(value))) return 'date';
    // Check if it's a number string
    if (!isNaN(Number(value)) && value.trim() !== '') return 'number';
  }
  return 'string';
}

// Export the main function with a shorter alias
export const makeAIRequest = makeAIRequestWithFallback;
