import { NextResponse } from 'next/server';
import { getAllClients } from '@/lib/config/clientRepository';

export async function GET() {
  const clients = await getAllClients();
  const companies = Object.fromEntries(
    clients.map(c => [c.key, {
      name: c.name,
      header_color: c.header_color,
      accent_color: c.accent_color,
      gsc_url: c.gsc_url,
    }])
  );
  return NextResponse.json({ companies });
}
