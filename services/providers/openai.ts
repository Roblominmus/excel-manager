/**
 * OpenAI Provider for AI Waterfall
 * 
 * Uses OpenAI's GPT models for spreadsheet query processing.
 */

import { AIResponse, SpreadsheetSchema } from '@/types/ai';

export async function makeOpenAIRequest(
  query: string,
  schema: SpreadsheetSchema
): Promise<AIResponse> {
  const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  
  if (!apiKey) {
    return { 
      success: false, 
      type: 'error', 
      error: 'OpenAI API key not configured' 
    };
  }
  
  try {
    const systemPrompt = `You are a helpful assistant that generates code for spreadsheet operations.
Given a user query and spreadsheet schema, generate appropriate code.

Spreadsheet Schema:
Headers: ${schema.headers.join(', ')}
Column Types: ${JSON.stringify(schema.columnTypes)}

Respond with one of these formats:
1. Formula: Return a single Excel/spreadsheet formula
2. Python: Return Python code using pandas
3. SQL: Return SQL query
4. Explanation: Provide a text explanation

Choose the most appropriate format based on the query.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Detect response type
    let type: AIResponse['type'] = 'transformation';
    if (content.startsWith('=') || content.toLowerCase().includes('formula:')) {
      type = 'formula';
    }

    return {
      success: true,
      type,
      code: content,
      explanation: content,
    };
  } catch (error: any) {
    console.error('[OpenAI Provider] Error:', error);
    return {
      success: false,
      type: 'error',
      error: error.message || 'OpenAI request failed',
    };
  }
}
