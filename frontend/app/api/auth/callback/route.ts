import { NextResponse } from 'next/server';
import { handleAuthCallback } from '@/lib/pipeline/authService';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  
  if (!code) {
    return NextResponse.redirect(new URL('/authenticate?error=missing_code', request.url));
  }
  
  const success = await handleAuthCallback(code);
  
  if (success) {
    return NextResponse.redirect(new URL('/authenticate?success=true', request.url));
  } else {
    return NextResponse.redirect(new URL('/authenticate?error=auth_failed', request.url));
  }
}
