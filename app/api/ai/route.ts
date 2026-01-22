import { NextRequest, NextResponse } from 'next/server';
import { makeAIRequest, extractSchema } from '@/services/ai-service';

export async function POST(request: NextRequest) {
  try {
    const { query, headers, firstRow } = await request.json();
    
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
    
    const schema = extractSchema(headers, firstRow);
    const response = await makeAIRequest(query, schema);
    
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[AI API Route] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        type: 'error', 
        error: error.message || 'Internal server error' 
      }, 
      { status: 500 }
    );
  }
}
