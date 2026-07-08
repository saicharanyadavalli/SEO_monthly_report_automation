# SEO Automator Frontend

This is a Next.js (App Router) frontend for the SEO Report System pipeline.

## Environment Variables

For the frontend to run properly and connect to the pipeline, ensure the following environment variables and files are configured:

### 1. Google OAuth (GSC & GA4 Access)
The pipeline uses a traditional desktop/web OAuth flow. You must obtain a `client_secret.json` from the Google Cloud Console and place it in the pipeline root directory (`../SEO_Report_System/client_secret.json`). 

*Scopes required:*
- `https://www.googleapis.com/auth/webmasters.readonly`
- `https://www.googleapis.com/auth/analytics.readonly`

### 2. LLM Provider (AI Insights)
The backend pipeline requires an LLM API key to generate natural language insights for the reports.
Add the following to a `.env` file in the pipeline root directory (`../SEO_Report_System/.env`):
```env
ANTHROPIC_API_KEY=your-api-key-here
# or
OPENAI_API_KEY=your-api-key-here
```

### 3. Next.js Frontend Configuration
The frontend automatically runs on `localhost:3000`. If you deploy it, ensure you configure the app URL:
```env
# In frontend/.env.local
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Running the Application
```bash
npm install
npm run dev
```

The frontend will automatically invoke the Python backend using `child_process.spawn`. Ensure that your Python environment is active or dependencies are globally available if running outside of a managed virtual environment.
