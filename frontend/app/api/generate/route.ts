import { NextRequest } from 'next/server';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';

const WRAPPER_PATH = path.join(process.cwd(), 'lib', 'pipeline', 'generate_wrapper.py');

export let activeProcess: ChildProcess | null = null;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { clientKey, useRealData, useAiInsights, slideList, llmModel } = body;

  if (!clientKey) {
    return new Response("Missing clientKey", { status: 400 });
  }

  const args = [WRAPPER_PATH, clientKey];
  if (!useRealData) args.push('--mock');
  if (!useAiInsights) args.push('--skip-llm');
  if (slideList && Array.isArray(slideList) && slideList.length > 0) {
    args.push('--slide-list', slideList.join(','));
  }
  if (llmModel && typeof llmModel === 'string') {
    args.push('--model', llmModel);
  }

  const stream = new ReadableStream({
    start(controller) {
      const pythonProcess = spawn('python', args);
      activeProcess = pythonProcess;

      const timeoutId: NodeJS.Timeout = setTimeout(() => {
        pythonProcess.kill('SIGTERM');
        controller.enqueue(`data: {"type": "result", "success": false, "error_message": "Pipeline timed out after 8 minutes. The report generation took too long and was cancelled."}\n\n`);
        try { controller.close(); } catch (e) {}
        activeProcess = null;
      }, 480000);

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
        clearTimeout(timeoutId);
        controller.enqueue(`data: {"type": "close", "code": ${code}}\n\n`);
        try { controller.close(); } catch (e) {}
        activeProcess = null;
      });
      
      pythonProcess.on('error', (err) => {
        clearTimeout(timeoutId);
        controller.enqueue(`data: {"type": "result", "success": false, "error_message": "${err.message}"}\n\n`);
        try { controller.close(); } catch (e) {}
        activeProcess = null;
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
