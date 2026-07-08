# SEO Report System

A full-stack automation tool designed to generate AI-powered SEO performance reports as native PowerPoint (.pptx) presentations.

## Architecture

```
SEO_Report_System/
├── backend/          ← Python pipeline (data collection, AI insights, PPTX generation)
│   ├── api.py        ← FastAPI server (serves the Next.js frontend)
│   ├── collectors/   ← Google Search Console, GA4, PageSpeed APIs
│   ├── report_generator/ ← Charts, data builder, PPTX generator, pipeline
│   ├── ai/           ← LLM insight generation (Anthropic Claude)
│   └── config/       ← Settings, company config models
└── frontend/         ← Next.js 14 web dashboard (wizard UI)
    ├── app/          ← App Router pages & API routes
    ├── components/   ← Wizard steps: Select → Toggle → Reorder → Generate
    ├── lib/          ← API client, slide catalog, client repository
    └── store/        ← Zustand state management
```

---

## 🚀 Quick Start (Run Locally)

You need **two terminals** — one for the backend API, one for the frontend.

### Terminal 1 — Backend API

```bash
cd backend

# Install Python dependencies (first time only)
pip install -r requirements.txt

# Start the FastAPI server
uvicorn api:app --reload --port 8000
```

The backend API will be available at **http://localhost:8000**

### Terminal 2 — Frontend Dashboard

```bash
cd frontend

# Install Node dependencies (first time only)
npm install

# Start the Next.js development server
npm run dev
```

Open **http://localhost:3000** in your browser.

---

## 🔑 Required API Keys & Credentials

### 1. Google OAuth (`client_secret.json`)

Required for accessing **Google Search Console (GSC)** and **Google Analytics 4 (GA4)** data.

**Steps:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create (or select) a project
3. Enable these two APIs:
   - **Google Search Console API**
   - **Google Analytics Data API**
4. Go to **APIs & Services → Credentials**
5. Click **Create Credentials → OAuth 2.0 Client ID**
6. Choose **Desktop Application** as application type
7. Download the JSON file
8. Rename it to `client_secret.json` and place it in the `backend/` directory

> **First Run:** On the first pipeline execution, a browser window will open asking you to sign into Google and grant read access to GSC and GA4. This generates a `backend/token.pickle` file which is reused on all subsequent runs.

---

### 2. Anthropic API Key (for AI Insights)

Required for Claude LLM to generate narrative analysis for the AI slides.

**Steps:**
1. Sign up / log in at [console.anthropic.com](https://console.anthropic.com/)
2. Create an API key
3. Copy it into your `.env` file

---

### 3. Google API Key (for PageSpeed Insights)

Required for the **Core Web Vitals** slide (FCP, LCP, TBT, CLS, SI).

**Steps:**
1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Click **Create Credentials → API key**
3. Enable the **PageSpeed Insights API** for your project
4. Copy the key into your `.env` file

---

### 4. `.env` File Setup

Create `backend/.env` by copying the example:

```bash
cp backend/.env.example backend/.env
```

Then fill in your values:

```env
# LLM Configuration (Anthropic Claude)
ANTHROPIC_AUTH_TOKEN=sk-ant-api03-...        # Your Anthropic API key
ANTHROPIC_MODEL=claude-sonnet-4-20250514     # Or another Claude model
ANTHROPIC_BASE_URL=                          # Leave blank for default Anthropic endpoint

# Google API Key (for PageSpeed Insights)
GOOGLE_API_KEY=AIzaSy...                     # Your Google API key

# Report settings (optional — defaults are fine)
# REPORT_MONTHS=6
# QUERY_COMPARE_DAYS=28
```

> **Tip:** If you don't have an Anthropic key, set `skip_llm=True` in the generate request or use the **"AI Insights: Disabled"** toggle in the wizard. The report will still generate with placeholder text.

---

## 👷 How the Wizard Works

1. **Configure** — Select a client and choose data/AI options
2. **Select Slides** — Toggle on/off each of the 19 slides
3. **Reorder Slides** — Drag-and-drop to set the slide order
4. **Generate** — Watch the live pipeline progress and download the `.pptx`

---

## 🗂 Client Configuration (`backend/company_config.json`)

Each client (company) is defined in `backend/company_config.json`:

```json
{
  "companies": {
    "your_client_key": {
      "name": "Your Client Name",
      "gsc_url": "https://www.example.com/",
      "url_speedvital": "https://www.example.com/",
      "header_color": "#1A56DB",
      "accent_color": "#0E9F6E",
      "ga4_property_id": "123456789",
      "brand_terms": ["brand", "brand name", "brand.com"]
    }
  }
}
```

You can also add/edit clients directly from the **Manage Clients** page in the dashboard.

---

## 🧪 Verify Backend API (Optional)

Once the backend is running at port 8000, test it:

```bash
# List all configured companies
curl http://localhost:8000/api/companies | python -m json.tool

# List all 19 available slides
curl http://localhost:8000/api/slides | python -m json.tool

# Generate a report (uses cached data, skips LLM)
curl -X POST http://localhost:8000/api/generate \
     -H "Content-Type: application/json" \
     -d '{"company_key": "sigmainfo", "slide_list": ["cover", "traffic_overview", "core_web_vitals"], "skip_llm": true}'
```

---

## 📦 Features

- **19-Slide PPTX Generation** — Native PowerPoint tables, charts, and editable text
- **AI Insights** — Automatic narrative synthesis using Anthropic Claude
- **Live Pipeline Progress** — SSE streaming updates in the browser
- **Drag-and-Drop Slide Reorder** — Customize slide order per report
- **Multi-Client Support** — Separate brand colors, logos, and GSC/GA4 properties per client
- **Skip LLM Mode** — Generate from cached data without API calls for rapid iteration
- **Core Web Vitals** — FCP, LCP, TBT, CLS, SI from PageSpeed Insights API