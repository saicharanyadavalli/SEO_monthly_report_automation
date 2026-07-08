import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { getAllClients } from '@/lib/config/clientRepository';

export async function GET() {
  try {
    const clients = await getAllClients();
    
    // Count reports
    let reportCount = 0;
    const reportsDir = path.join(process.cwd(), '..', 'backend', 'reports');
    
    try {
      const companies = await fs.readdir(reportsDir, { withFileTypes: true });
      for (const dirent of companies) {
        if (dirent.isDirectory()) {
          const files = await fs.readdir(path.join(reportsDir, dirent.name));
          reportCount += files.filter(f => f.endsWith('.pptx')).length;
        }
      }
    } catch (e) {
      // Ignore if reports dir doesn't exist
    }

    return NextResponse.json({
      clientCount: clients.length,
      reportCount
    });
  } catch (error) {
    return NextResponse.json({ clientCount: 0, reportCount: 0 });
  }
}
