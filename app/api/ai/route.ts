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
    
    // Extract schema and pass full row data for AI to analyze
    const schema = extractSchema(headers, rows && rows.length > 0 ? rows[0] : undefined);
    
    // Add full data context to schema for better AI responses
    const enhancedSchema = {
      ...schema,
      rowCount: rows?.length || 0,
      sampleRows: rows?.slice(0, 20) || [], // Send first 20 rows as sample
    };
    
    const response = await makeAIRequest(query, enhancedSchema);
    
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
