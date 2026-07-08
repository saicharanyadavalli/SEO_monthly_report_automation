# SEO Report System

A full-stack automation tool designed to generate AI-powered SEO performance reports as native PowerPoint (.pptx) presentations. This system collects data from Google Search Console (GSC), Google Analytics 4 (GA4), and PageSpeed Insights, processes it using AI, and outputs a highly polished presentation tailored to your client's brand.

---

## 🏗️ Architecture

```
SEO_Report_System/
├── backend/          ← Python pipeline 
│                       (The brain: Collects data from Google, generates AI insights, creates Charts, and builds the PPTX file)
│   ├── api.py        ← FastAPI server (Listens for requests from the frontend)
│   ├── collectors/   ← Google Search Console, GA4, PageSpeed API scripts
│   ├── report_generator/ ← Matplotlib charts, data builder, PPTX builder
│   ├── ai/           ← LLM insight generation (Zhipu GLM)
│   └── config/       ← Settings, company config models
└── frontend/         ← Next.js 14 web dashboard 
                        (The UI: Provides the wizard, settings, and client management interface for the user)
    ├── app/          ← App Router pages & API routes
    ├── components/   ← Wizard steps: Select → Toggle → Reorder → Generate
    ├── lib/          ← API client, slide catalog, client repository
    └── store/        ← Zustand state management
```

### Why are there two parts?

- **The Frontend (Node.js/Next.js)** is the user interface. It provides the visual dashboard, forms to add clients, and the wizard to configure your report.
- **The Backend (Python/FastAPI)** is the engine. Generating PowerPoint files, drawing charts, and running complex data aggregations from Google APIs is best handled in Python. The frontend sends a request to this Python backend to do the heavy lifting whenever you click "Generate".

---

## 🛠️ System Requirements

Before you begin, ensure you have the following installed on your computer:

1. **Python 3.8+** (for the backend pipeline)
2. **Node.js 18+** (for the frontend dashboard)
3. **npm** (comes with Node.js)

---

## 🚀 Step-by-Step Installation Guide

Follow these steps to set up the SEO Report System from scratch.

### Step 1: Clone or Extract the Repository

Open your terminal and navigate to the directory where you want to store the project.

```bash
cd path/to/your/folder
```

### Step 2: Set Up the Python Backend

Open a terminal and navigate to the `backend` folder.

```bash
cd backend

# Create a virtual environment
python -m venv .venv

# Activate the virtual environment
# On Windows:
.venv\Scripts\activate
# On Mac/Linux:
source .venv/bin/activate

# Install all required Python dependencies
python -m pip install -r requirements.txt
```

### Step 3: Set Up the Node.js Frontend

Open a **new terminal tab/window**, navigate to the `frontend` folder, and install the dependencies.

```bash
cd frontend

# Install Node dependencies
npm install

npm run dev
```

### Step 4: Configure the Frontend Environment

Inside the `frontend` folder, create a file named `.env.local`:

```bash
# In frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
COMPANY_CONFIG_PATH=../backend/company_config.json
```

---

## 🔑 Required API Keys & Credentials

You must set up your API keys to fetch data and generate AI insights.

### 1. Google OAuth (`client_secret.json`)

Required for accessing **Google Search Console (GSC)** and **Google Analytics 4 (GA4)** data. Because this is a private internal tool, you need to create your own Google Cloud app to authenticate yourself.

**Step A: Enable APIs**

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (or select an existing one).
3. Search for and enable these two APIs:
   - **Google Search Console API**
   - **Google Analytics Data API**

**Step B: Configure the OAuth Consent Screen**

1. Go to **APIs & Services → OAuth consent screen**.
2. Select **External** and click Create.
3. Fill in the required fields (App name, User support email, Developer contact email). You can ignore the rest.
4. Click **Save and Continue** through the Scopes page.
5. On the **Test Users** page, click **Add Users** and enter the Google Email address you use for your Google Search Console/Analytics. **(Crucial: If you skip this, you won't be able to log in!)**
6. Click **Save and Continue**.

**Step C: Create the Credentials (`client_secret.json`)**

1. Go to **APIs & Services → Credentials**.
2. Click **Create Credentials → OAuth 2.0 Client ID**.
3. Choose **Desktop Application** as the application type.
4. Name it (e.g., "SEO Report Tool") and click Create.
5. Download the JSON file.
6. Rename the downloaded file exactly to `client_secret.json` and place it directly inside the `backend/` directory.

### 2. AI Model API Key (Zhipu GLM)

Required for the LLM to generate narrative analysis for the AI slides. We support GLM-5, GLM-4, etc.

**Steps:**

1. Go to the Zhipu AI platform to obtain your API Key.
2. Copy the key.

### 3. Google API Key (for PageSpeed Insights)

Required for the **Core Web Vitals** slide (FCP, LCP, TBT, CLS, SI).

**Steps:**

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials).
2. Click **Create Credentials → API key**.
3. Enable the **PageSpeed Insights API** for your project.
4. Copy the API key.

### 4. Setting up the Backend `.env` File

Inside the `backend/` directory, create a `.env` file (you can copy `.env.example` if available) and fill in your values:

```env
# LLM Configuration (Zhipu GLM)
ANTHROPIC_AUTH_TOKEN=your_zhipu_api_key_here
ANTHROPIC_MODEL=glm-5
ANTHROPIC_BASE_URL=https://open.bigmodel.cn/api/paas/v4/

# Google API Key (for PageSpeed Insights)
GOOGLE_API_KEY=AIzaSy...your_google_api_key_here

# Report settings (Optional)
# REPORT_MONTHS=6
# QUERY_COMPARE_DAYS=28
```

---

## 🏃‍♂️ Running the Application (How to Start)

Because the system is split into a UI (frontend) and an Engine (backend), **you must run both simultaneously** for the application to work. You need to open **two separate terminal windows**.

### Terminal 1: Start the Python Backend (The Engine)

This terminal starts the FastAPI server that waits for commands from the dashboard to generate reports.

```bash
cd backend

# Ensure your virtual environment is activated first!
# On Windows: .venv\Scripts\activate
# On Mac/Linux: source .venv/bin/activate

# Start the server
uvicorn api:app --reload --port 8000
```

*Leave this terminal running in the background.*

### Terminal 2: Start the Next.js Frontend (The Dashboard)

This terminal runs the React dashboard that you interact with in your browser.

```bash
cd frontend

# Start the development server
npm run dev
```

*Leave this terminal running in the background.*

**You are now ready! Open your browser and navigate to:** [http://localhost:3000](http://localhost:3000)

---

## 📖 How to Use the Dashboard

### 1. Authenticate with Google

Before generating your first report, you must authenticate the application to read your GSC and GA4 data.

1. In the dashboard, you will be prompted to authenticate if credentials are missing.
2. A new browser tab will open asking you to sign into your Google account.
3. **Important:** Check the boxes to grant read access to Search Console and Google Analytics.
4. Once completed, a `token.pickle` file will be saved in your `backend/` directory, and you won't need to sign in again.

### 2. Manage Clients

Click on **"Manage Clients"** in the sidebar.

1. **Add a Client:** Click "Add Client".
2. Enter the Client Name, GSC URL (e.g., `sc-domain:example.com`), GA4 Property ID, and Brand Terms.
3. **Upload Logo:** Select a company logo file. This logo will automatically be placed on the cover slide of the generated PPTX!
4. Choose Primary and Secondary branding colors to match your client's brand.
5. Save the client.

### 3. Generate a Report

Navigate to the **Report Generator Wizard** on the home page.

1. **Configure:** Select your client from the dropdown menu. You can also change the LLM model to use.
2. **Select Slides:** Toggle which of the 19 available slides you want to include in the report.
3. **Reorder Slides:** Simply drag and drop the slides to arrange them in the perfect order.
4. **Generate:** Click **"Start Generation"**.
   - The UI will stream live progress as the pipeline fetches GSC data, GA4 data, Core Web Vitals, generates high-quality 300 DPI charts, generates AI insights, and finally writes the `.pptx` file.
   - When it completes, a **Download Report** button will appear!

---

## 📦 Key Features

- **19-Slide PPTX Generation** — Native PowerPoint tables, crisp 300 DPI charts, and editable text.
- **Client Logos & Branding** — Fully customizable colors and logo uploads directly in the dashboard.
- **AI Insights** — Automatic, actionable narrative synthesis using GLM models that explains *why* traffic changed and suggests *what* to do.
- **Live Pipeline Progress** — SSE streaming updates in the browser so you know exactly what is happening.
- **Drag-and-Drop Slide Reorder** — Customize the slide order per report intuitively.
- **Multi-Client Support** — Separate brand colors, logos, and configurations.
- **Skip LLM Mode** — Generate from cached data without API calls for rapid testing.
- **Core Web Vitals** — Real-world performance data from the PageSpeed Insights API.
