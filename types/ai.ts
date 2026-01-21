/**
 * Types for AI Service
 */

export interface SpreadsheetSchema {
  headers: string[];
  columnTypes: Record<string, string>;
  sampleData?: string[]; // Only first row for context, not actual data
}

export interface AIRequest {
  userQuery: string;
  schema: SpreadsheetSchema;
}

export interface AIResponse {
  success: boolean;
  type: 'formula' | 'transformation' | 'error';
  code?: string; // Excel formula or JavaScript code
  explanation?: string;
  error?: string;
  provider?: string; // Which AI provider was used
}

export interface AIProviderConfig {
  name: string;
  apiKey: string;
  endpoint: string;
  makeRequest: (query: string, schema: SpreadsheetSchema) => Promise<AIResponse>;
}

export type AIProviderName = 'deepseek' | 'cohere' | 'groq' | 'xai';
