import { NextResponse } from 'next/server';
import { revokeAccess } from '@/lib/pipeline/authService';

export async function POST() {
  const success = await revokeAccess();
  return NextResponse.json({ success });
}
