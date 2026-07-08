import { NextResponse } from 'next/server';
import { activeProcess } from '../route';

export async function DELETE() {
  if (activeProcess) {
    try {
      activeProcess.kill('SIGTERM');
      return NextResponse.json({ cancelled: true });
    } catch (error: any) {
      return NextResponse.json({ cancelled: false, error: error.message }, { status: 500 });
    }
  }
  return NextResponse.json({ cancelled: false, reason: "No active process" });
}
