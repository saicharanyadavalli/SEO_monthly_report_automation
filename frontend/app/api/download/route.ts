import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const filePath = searchParams.get('path');

  if (!filePath) {
    return new NextResponse("Missing file path", { status: 400 });
  }

  // Basic security check: ensure it's in the reports directory
  const reportsDir = path.join(process.cwd(), '..', 'backend', 'reports');
  const normalizedPath = path.resolve(filePath);
  
  if (!normalizedPath.startsWith(reportsDir)) {
    return new NextResponse("Invalid path", { status: 403 });
  }

  try {
    if (!fs.existsSync(normalizedPath)) {
      return new NextResponse("File not found", { status: 404 });
    }

    const fileBuffer = fs.readFileSync(normalizedPath);
    const fileName = path.basename(normalizedPath);

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("Download error:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
