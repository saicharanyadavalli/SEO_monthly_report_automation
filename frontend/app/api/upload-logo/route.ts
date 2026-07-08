import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { key, imageBase64, filename } = data;

    if (!key || !imageBase64) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Determine the directory to save logos
    const backendDir = path.join(process.cwd(), '..', 'backend');
    const logosDir = path.join(backendDir, 'config', 'logos');

    // Ensure directory exists
    await fs.mkdir(logosDir, { recursive: true });

    // Extract base64 data
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const ext = filename.split('.').pop() || 'png';
    const filePath = path.join(logosDir, `${key}_logo.${ext}`);

    // Save file
    await fs.writeFile(filePath, base64Data, 'base64');

    return NextResponse.json({ success: true, path: filePath });
  } catch (error: any) {
    console.error('Error uploading logo:', error);
    return NextResponse.json({ error: error.message || 'Failed to upload logo' }, { status: 500 });
  }
}
