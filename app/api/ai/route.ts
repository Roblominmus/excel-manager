import { NextRequest, NextResponse } from 'next/server';
import { makeAIRequest, extractSchema } from '@/services/ai-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, headers, rows } = body;
    
    if (!query || !headers) {
      return NextResponse.json(
        { 
          success: false, 
          type: 'error', 
          error: 'Missing required parameters: query and headers are required' 
        }, 
        { status: 400 }
      );
    }
    
    // Use first row for schema, but send context about full data being available
    const schema = extractSchema(headers, rows && rows.length > 0 ? rows[0] : undefined);
    const response = await makeAIRequest(query, schema);
    
    return NextResponse.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('[AI API Route] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        type: 'error', 
        error: errorMessage 
      }, 
      { status: 500 }
    );
  }
}
