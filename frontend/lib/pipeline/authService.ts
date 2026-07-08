import fs from 'fs/promises';
import path from 'path';
import { google } from 'googleapis';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const PIPELINE_DIR = path.join(process.cwd(), '..', 'backend');
const CLIENT_SECRET_PATH = path.join(PIPELINE_DIR, 'client_secret.json');
const TOKEN_PICKLE_PATH = path.join(PIPELINE_DIR, 'token.pickle');
const AUTH_HELPER_PATH = path.join(process.cwd(), 'lib', 'pipeline', 'auth_helper.py');

export interface AuthStatus {
  authenticated: boolean;
  expired?: boolean;
  scopes?: string[];
  error?: string;
  missingCredentials?: boolean;
}

export async function getClientSecret() {
  try {
    const data = await fs.readFile(CLIENT_SECRET_PATH, 'utf-8');
    const json = JSON.parse(data);
    const client = json.installed || json.web;
    if (!client) throw new Error("Invalid client_secret.json format");
    return client;
  } catch (error) {
    return null;
  }
}

function getOAuth2Client(clientSecretData: any) {
  return new google.auth.OAuth2(
    clientSecretData.client_id,
    clientSecretData.client_secret,
    // The pipeline uses InstalledAppFlow usually on port 0.
    // For this Next.js app, we use a fixed callback.
    process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback` : 'http://localhost:3000/api/auth/callback'
  );
}

export async function getAuthUrl(): Promise<{ url?: string; error?: string }> {
  const clientData = await getClientSecret();
  if (!clientData) {
    return { error: 'missing_credentials' };
  }

  const oauth2Client = getOAuth2Client(clientData);

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // Force consent to ensure we get a refresh token
    scope: [
      'https://www.googleapis.com/auth/webmasters.readonly',
      'https://www.googleapis.com/auth/analytics.readonly'
    ]
  });

  return { url };
}

export async function handleAuthCallback(code: string): Promise<boolean> {
  const clientData = await getClientSecret();
  if (!clientData) return false;

  const oauth2Client = getOAuth2Client(clientData);
  
  try {
    const { tokens } = await oauth2Client.getToken(code);
    
    // We have the tokens as JSON. We need to save them as token.pickle for the pipeline.
    // Call the Python helper script.
    const tokenPayload = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_uri: clientData.token_uri || 'https://oauth2.googleapis.com/token',
      client_id: clientData.client_id,
      client_secret: clientData.client_secret,
      scope: tokens.scope || 'https://www.googleapis.com/auth/webmasters.readonly https://www.googleapis.com/auth/analytics.readonly'
    };

    await new Promise<void>((resolve, reject) => {
      const { spawn } = require('child_process');
      const py = spawn('python', [AUTH_HELPER_PATH, 'save', TOKEN_PICKLE_PATH]);
      
      py.stdin.write(JSON.stringify(tokenPayload));
      py.stdin.end();
      
      py.on('close', (code: number) => {
        if (code === 0) resolve();
        else reject(new Error(`Python process exited with code ${code}`));
      });
      py.on('error', reject);
    });

    return true;
  } catch (error) {
    console.error("Error exchanging token or pickling:", error);
    return false;
  }
}

export async function getAuthStatus(): Promise<AuthStatus> {
  const clientData = await getClientSecret();
  if (!clientData) {
    return { authenticated: false, missingCredentials: true };
  }

  try {
    const { stdout } = await execAsync(`python "${AUTH_HELPER_PATH}" check "${TOKEN_PICKLE_PATH}"`);
    const status = JSON.parse(stdout.trim());
    
    // If expired but refresh token is present, we could attempt a silent refresh here.
    // However, the python pipeline's gsc_service.py automatically handles refresh via:
    // if creds and creds.expired and creds.refresh_token: creds.refresh(Request())
    // So if it's expired but has a refresh token, it's effectively "authenticated".
    
    return {
      authenticated: status.authenticated,
      expired: status.expired,
      scopes: status.scopes,
      error: status.error
    };
  } catch (error: any) {
    console.error("Error checking auth status:", error);
    return { authenticated: false, error: error.message };
  }
}

export async function revokeAccess(): Promise<boolean> {
  try {
    await fs.unlink(TOKEN_PICKLE_PATH);
    return true;
  } catch (error: any) {
    // Ignore if file doesn't exist
    if (error.code === 'ENOENT') return true;
    return false;
  }
}
