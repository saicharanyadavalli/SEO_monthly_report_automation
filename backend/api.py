"""FastAPI backend for the SEO Report System frontend.

Run with:
    cd backend
    uvicorn api:app --reload --port 8000

Endpoints:
    POST /api/generate           - Run the report pipeline
    GET  /api/companies          - List all configured companies
    GET  /api/slides             - Get canonical slide list with labels
    GET  /api/reports/{key}      - List previously generated reports for a company
    GET  /api/download/{key}/{filename} - Download a generated .pptx file
"""
from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

from config.models import get_all_companies, get_company, reload_companies
from config.settings import settings
from report_generator.pipeline import ReportPipeline, get_previous_reports

logger = logging.getLogger(__name__)

app = FastAPI(
    title="SEO Report System API",
    description="Backend API for the SEO Report System Next.js frontend",
    version="1.0.0",
)

# Allow the Next.js dev server on localhost:3000
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Canonical slide list (single source of truth)
# ---------------------------------------------------------------------------
CANONICAL_SLIDES = [
    {"id": "cover",                        "label": "Cover / Title"},
    {"id": "traffic_overview",             "label": "Traffic Overview"},
    {"id": "6month_summary",               "label": "6-Month Summary (AI)"},
    {"id": "monthly_summary",              "label": "Monthly Summary (AI)"},
    {"id": "content_trending_up",          "label": "Content Trending Up"},
    {"id": "content_trending_down",        "label": "Content Trending Down"},
    {"id": "top_queries",                  "label": "Top Queries"},
    {"id": "keyword_table_branded",        "label": "Branded Keywords Table"},
    {"id": "keyword_analysis_branded",     "label": "Branded Keywords Analysis (AI)"},
    {"id": "keyword_table_nonbranded",     "label": "Non-Branded Keywords Table"},
    {"id": "keyword_analysis_nonbranded",  "label": "Non-Branded Keywords Analysis (AI)"},
    {"id": "branded_vs_nonbranded",        "label": "Branded vs Non-Branded"},
    {"id": "pages_table_nonblog",          "label": "Top Pages Table"},
    {"id": "pages_analysis_nonblog",       "label": "Top Pages Analysis"},
    {"id": "pages_table_blog",             "label": "Blog Pages Table"},
    {"id": "pages_analysis_blog",          "label": "Blog Pages Analysis"},
    {"id": "channels",                     "label": "Organic Channels"},
    {"id": "channels_charts",              "label": "Channels Charts"},
    {"id": "core_web_vitals",              "label": "Core Web Vitals"},
]


# ---------------------------------------------------------------------------
# Request / response models
# ---------------------------------------------------------------------------
class GenerateRequest(BaseModel):
    company_key: str
    slide_list: Optional[List[str]] = None
    skip_llm: bool = False


class GenerateResponse(BaseModel):
    success: bool
    output_path: Optional[str] = None
    file_size_mb: Optional[float] = None
    error: Optional[str] = None


# ---------------------------------------------------------------------------
# Routes
# 
# NOTE: If any routes are added to create or update companies in company_config.json,
# you MUST call `reload_companies()` after the write succeeds to bust the cache.
# ---------------------------------------------------------------------------

@app.get("/api/slides")
async def get_slides():
    """Return the canonical ordered list of all 19 slide IDs with human-readable labels."""
    return {"slides": CANONICAL_SLIDES}


@app.get("/api/companies")
async def get_companies():
    """Return all configured companies."""
    companies = get_all_companies()
    return {
        "companies": {
            key: {
                "name": c.name,
                "header_color": c.header_color,
                "accent_color": c.accent_color,
                "gsc_url": c.gsc_url,
            }
            for key, c in companies.items()
        }
    }


@app.post("/api/generate", response_model=GenerateResponse)
async def generate_report(req: GenerateRequest):
    """
    Run the report pipeline for the given company.

    - If ``skip_llm=True`` and a pre-saved ``output/seo_data_{company_key}.json``
      exists, the pipeline will skip live Google API calls and use cached data.
    - ``slide_list`` controls which slides are rendered and their order.
    """
    company = get_company(req.company_key)
    if not company:
        raise HTTPException(status_code=404, detail=f"Company '{req.company_key}' not found")

    try:
        pipeline = ReportPipeline(
            company_key=req.company_key,
            skip_llm=req.skip_llm,
            slide_list=req.slide_list,
        )
        result = pipeline.run()

        if result.success:
            size_mb = 0.0
            if result.output_path and result.output_path.exists():
                size_mb = round(result.output_path.stat().st_size / (1024 * 1024), 2)
            return GenerateResponse(
                success=True,
                output_path=str(result.output_path),
                file_size_mb=size_mb,
            )
        else:
            return GenerateResponse(
                success=False,
                error=result.error_message or "Pipeline failed with unknown error",
            )
    except Exception as exc:
        logger.exception("Unhandled error in /api/generate")
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/api/reports/{company_key}")
async def list_reports(company_key: str):
    """List previously generated PPTX reports for a company."""
    company = get_company(company_key)
    if not company:
        raise HTTPException(status_code=404, detail=f"Company '{company_key}' not found")

    reports = get_previous_reports(company.name)
    return {"reports": reports}


@app.get("/api/download/{company_key}/{filename}")
async def download_report(company_key: str, filename: str):
    """Download a previously generated PPTX file."""
    company = get_company(company_key)
    if not company:
        raise HTTPException(status_code=404, detail=f"Company '{company_key}' not found")

    # Build safe path inside the reports directory
    company_dir = settings.reports_dir / company.name.replace(" ", "_")
    file_path = (company_dir / filename).resolve()

    # Ensure the resolved path is still inside the expected reports dir
    safe_base = company_dir.resolve()
    if not str(file_path).startswith(str(safe_base)):
        raise HTTPException(status_code=403, detail="Forbidden path")

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(
        path=str(file_path),
        filename=filename,
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
    )
