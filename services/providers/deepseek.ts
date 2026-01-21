/**
 * DeepSeek AI Provider
 * https://platform.deepseek.com/api-docs/
 */

import { AIResponse, SpreadsheetSchema } from '@/types/ai';

export async function makeDeepSeekRequest(
  query: string,
  schema: SpreadsheetSchema
): Promise<AIResponse> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  
  if (!apiKey) {
    return {
      success: false,
      type: 'error',
      error: 'DeepSeek API key not configured',
    };
  }

  const systemPrompt = `You are an Excel formula and data transformation expert. 
You will receive a spreadsheet schema (column headers and types) and a user's natural language request.
Your job is to output ONLY valid Excel formulas or JavaScript transformation code.

CRITICAL SECURITY RULE: You will NEVER see actual row data. Only the schema.

Return a JSON response with:
{
  "type": "formula" or "transformation",
  "code": "the formula or JavaScript code",
  "explanation": "brief explanation"
}`;

  const userPrompt = `Schema: ${JSON.stringify(schema)}
User Request: ${query}

Generate the appropriate formula or transformation code.`;

  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`DeepSeek API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in DeepSeek response');
    }

    // Parse the JSON response
    const parsed = JSON.parse(content);
    
    return {
      success: true,
      type: parsed.type,
      code: parsed.code,
      explanation: parsed.explanation,
      provider: 'DeepSeek',
    };
  } catch (error: any) {
    return {
      success: false,
      type: 'error',
      error: error.message || 'DeepSeek request failed',
      provider: 'DeepSeek',
    };
  }
}
