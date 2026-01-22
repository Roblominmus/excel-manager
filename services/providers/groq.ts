/**
 * Groq AI Provider
 * https://console.groq.com/docs/
 */

import { AIResponse, SpreadsheetSchema } from '@/types/ai';

export async function makeGroqRequest(
  query: string,
  schema: SpreadsheetSchema
): Promise<AIResponse> {
  const apiKey = process.env.GROQ_API_KEY;
  
  if (!apiKey) {
    return {
      success: false,
      type: 'error',
      error: 'Groq API key not configured',
    };
  }

  const systemPrompt = `You are an Excel formula and data transformation expert. 
You will receive a spreadsheet schema (column headers and types), the actual spreadsheet data, and a user's natural language request.
Your job is to output ONLY valid Excel formulas that can operate on the provided data.

You can access the full spreadsheet data to understand context and generate accurate formulas.
For example, if asked to sum a column, generate: =SUM(A:A) 
For average: =AVERAGE(B:B)
For counting with conditions: =COUNTIF(A:A,">=100")

Return a JSON response with:
{
  "type": "formula",
  "code": "the Excel formula",
  "explanation": "brief explanation of what the formula does"
}`;

  const userPrompt = `Schema: ${JSON.stringify(schema)}
User Request: ${query}

Generate the appropriate Excel formula to answer this request.`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
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
      throw new Error(`Groq API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in Groq response');
    }

    // Parse the JSON response
    const parsed = JSON.parse(content);
    
    return {
      success: true,
      type: parsed.type,
      code: parsed.code,
      explanation: parsed.explanation,
      provider: 'Groq',
    };
  } catch (error: any) {
    return {
      success: false,
      type: 'error',
      error: error.message || 'Groq request failed',
      provider: 'Groq',
    };
  }
}
