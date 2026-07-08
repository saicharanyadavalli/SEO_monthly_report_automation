import { NextResponse } from 'next/server';
import { SLIDE_CATALOG } from '@/lib/catalog/slides';

export async function GET() {
  return NextResponse.json({
    slides: SLIDE_CATALOG.map(s => ({ id: s.id, label: s.name }))
  });
}
