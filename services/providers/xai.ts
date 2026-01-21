/**
 * X.AI (Grok) Provider
 * https://docs.x.ai/api
 */

import { AIResponse, SpreadsheetSchema } from '@/types/ai';

export async function makeXAIRequest(
  query: string,
  schema: SpreadsheetSchema
): Promise<AIResponse> {
  const apiKey = process.env.XAI_API_KEY;
  
  if (!apiKey) {
    return {
      success: false,
      type: 'error',
      error: 'X.AI API key not configured',
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
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'grok-beta',
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
      throw new Error(`X.AI API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in X.AI response');
    }

    // Parse the JSON response
    const parsed = JSON.parse(content);
    
    return {
      success: true,
      type: parsed.type,
      code: parsed.code,
      explanation: parsed.explanation,
      provider: 'X.AI',
    };
  } catch (error: any) {
    return {
      success: false,
      type: 'error',
      error: error.message || 'X.AI request failed',
      provider: 'X.AI',
    };
  }
}
