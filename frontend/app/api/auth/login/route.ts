import { NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/pipeline/authService';

export async function GET(request: Request) {
  const { url, error } = await getAuthUrl();
  
  if (error === 'missing_credentials') {
    return NextResponse.redirect(new URL('/authenticate?error=missing_credentials', request.url));
  }
  
  if (url) {
    return NextResponse.redirect(url);
  }
  
  return NextResponse.redirect(new URL('/authenticate?error=unknown', request.url));
}
