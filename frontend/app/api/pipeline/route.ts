import { NextResponse } from 'next/server';

/**
 * GET /api/pipeline
 * Returns pipeline status metadata. 
 * Actual SSE streaming is handled by /api/generate (POST).
 */
export async function GET() {
  return NextResponse.json({
    status: 'idle',
    message: 'Use POST /api/generate to start the pipeline with SSE streaming.',
  });
}
