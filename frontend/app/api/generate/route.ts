import { NextRequest } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

const WRAPPER_PATH = path.join(process.cwd(), 'lib', 'pipeline', 'generate_wrapper.py');

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { clientKey, useRealData, useAiInsights, slideList } = body;

  if (!clientKey) {
    return new Response("Missing clientKey", { status: 400 });
  }

  const args = [WRAPPER_PATH, clientKey];
  if (!useRealData) args.push('--mock');
  if (!useAiInsights) args.push('--skip-llm');
  if (slideList && Array.isArray(slideList) && slideList.length > 0) {
    args.push('--slide-list', slideList.join(','));
  }

  const stream = new ReadableStream({
    start(controller) {
      const pythonProcess = spawn('python', args);

      pythonProcess.stdout.on('data', (data) => {
        const lines = data.toString().split('\n');
        for (const line of lines) {
          if (line.trim()) {
            try {
              // Parse to verify it's valid JSON from our wrapper
              JSON.parse(line);
              controller.enqueue(`data: ${line}\n\n`);
            } catch (e) {
              // Ignore non-JSON logs that might have sneaked through
              console.log("Ignored python output:", line);
            }
          }
        }
      });

      pythonProcess.stderr.on('data', (data) => {
        console.error(`Python stderr: ${data}`);
      });

      pythonProcess.on('close', (code) => {
        controller.enqueue(`data: {"type": "close", "code": ${code}}\n\n`);
        controller.close();
      });
      
      pythonProcess.on('error', (err) => {
        controller.enqueue(`data: {"type": "result", "success": false, "error_message": "${err.message}"}\n\n`);
        controller.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
