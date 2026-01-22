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

  const systemPrompt = `You are an Excel formula and data analysis expert with access to ACTUAL spreadsheet data.
When asked about data, analyze the rows provided and give COMPUTED ANSWERS, not just formulas.

IMPORTANT:
- Use fuzzy matching for names (e.g., "acme" should match "Acme Corp", "Acme Inc", etc.)
- When asked for totals, sums, or counts - CALCULATE and return the actual number
- Provide both the formula AND the computed result when applicable
- Look at the actual data values to understand context

Available data:
Headers: ${schema.headers?.join(', ') || 'None'}
Row count: ${(schema as any).rowCount || 0}
Sample data: ${JSON.stringify((schema as any).sampleRows?.slice(0, 5) || [])}

Return a JSON response with:
{
  "type": "formula",
  "code": "the Excel formula",
  "explanation": "brief explanation with computed result if applicable"
}`;

  const userPrompt = `User Request: ${query}

Analyze the spreadsheet data and generate the appropriate Excel formula. If the request asks for a calculation, compute the actual result from the sample data provided.`;

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
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in Groq response');
    }

    // Parse the JSON response with error handling
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (parseError) {
      // If JSON parsing fails, try to extract code from markdown blocks
      const codeMatch = content.match(/```(?:excel|formula)?\n?(.*?)\n?```/s);
      if (codeMatch) {
        return {
          success: true,
          type: 'formula',
          code: codeMatch[1].trim(),
          explanation: content.replace(/```(?:excel|formula)?\n?.*?\n?```/s, '').trim(),
          provider: 'Groq',
        };
      }
      
      // Return content as explanation if we can't parse it
      return {
        success: true,
        type: 'formula',
        code: '',
        explanation: content,
        provider: 'Groq',
      };
    }
    
    // Validate parsed response
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid response format from Groq');
    }
    
    return {
      success: true,
      type: parsed.type || 'formula',
      code: parsed.code || '',
      explanation: parsed.explanation || 'No explanation provided',
      provider: 'Groq',
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Groq request failed';
    return {
      success: false,
      type: 'error',
      error: errorMessage,
      provider: 'Groq',
    };
  }
}
