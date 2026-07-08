"""Report Pipeline - orchestrates the complete report generation workflow."""
from __future__ import annotations

import json
import logging
import traceback
from dataclasses import dataclass
from datetime import date, timedelta
from enum import Enum
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

from config.models import CompanyConfig, get_company
from config.settings import settings
from collectors.gsc_service import GSCService
from collectors.ga4_service import GA4Service
from ai.insight_generator import AIInsightGenerator
from .chart_generator import ChartGenerator
from .pptx_generator import PPTXGenerator

logger = logging.getLogger(__name__)


class PipelineStep(Enum):
    """Pipeline execution steps."""
    COLLECT_GSC = 1
    COLLECT_GA4 = 2
    COLLECT_PAGESPEED = 3
    BUILD_DATA = 4
    GENERATE_CHARTS = 5
    GENERATE_INSIGHTS = 6
    BUILD_PPTX = 7


@dataclass
class PipelineProgress:
    """Progress information for pipeline execution."""
    step: PipelineStep
    step_name: str
    current: int
    total: int
    message: str
    is_complete: bool = False
    error: Optional[str] = None


@dataclass
class PipelineResult:
    """Result of pipeline execution."""
    success: bool
    company_key: str
    company_name: str
    output_path: Optional[Path] = None
    seo_data_path: Optional[Path] = None
    error_message: Optional[str] = None
    traceback: Optional[str] = None


class ReportPipeline:
    """Orchestrates the complete SEO report generation workflow."""

    def __init__(
        self,
        company_key: str,
        progress_callback: Optional[Callable[[PipelineProgress], None]] = None,
        skip_llm: bool = False,
        slide_list: Optional[List[str]] = None,
        model: Optional[str] = None,
    ) -> None:
        self.company_key = company_key.lower()
        self.progress_callback = progress_callback
        self.skip_llm = skip_llm
        self.slide_list = slide_list
        self.model = model

        self.company: Optional[CompanyConfig] = None
        self.seo_data: Dict[str, Any] = {}
        self.texts: Dict[str, str] = {}
        self.chart_paths: Dict[str, Path] = {}

    def _emit_progress(self, step: PipelineStep, message: str, is_complete: bool = False, error: str = None):
        """Emit progress update."""
        if self.progress_callback:
            progress = PipelineProgress(
                step=step,
                step_name=step.name.replace("_", " ").title(),
                current=step.value,
                total=len(PipelineStep),
                message=message,
                is_complete=is_complete,
                error=error,
            )
            self.progress_callback(progress)

    def run(self) -> PipelineResult:
        """Execute the complete pipeline."""
        logger.info("Starting report pipeline for: %s", self.company_key)

        try:
            # Step 0: Load company config
            self.company = get_company(self.company_key)
            if not self.company:
                return PipelineResult(
                    success=False,
                    company_key=self.company_key,
                    company_name="Unknown",
                    error_message=f"Company '{self.company_key}' not found in configuration",
                )

            # Step 1: Collect GSC Data
            self._emit_progress(PipelineStep.COLLECT_GSC, "Collecting Google Search Console data...")
            gsc = GSCService(
                site_url=self.company.gsc_url,
                brand_terms=self.company.brand_terms,
            )

            # Calculate date ranges
            from datetime import date, timedelta
            from dateutil.relativedelta import relativedelta

            today = date.today()
            report_end_date = today.replace(day=1) - timedelta(days=1)
            months = settings.report_months
            start_date = (report_end_date.replace(day=1) - relativedelta(months=months - 1)).strftime("%Y-%m-%d")
            end_date = report_end_date.strftime("%Y-%m-%d")
            month_start = report_end_date.replace(day=1).strftime("%Y-%m-%d")

            # Collect GSC metrics
            traffic = gsc.get_monthly_traffic(months=months)
            pages = gsc.get_top_pages(month_start, end_date, limit=10)
            page_deltas = gsc.get_page_click_delta(limit=10)
            branded_kw = gsc.get_branded_keywords(month_start, end_date)
            non_branded_kw = gsc.get_non_branded_keywords(month_start, end_date)
            branded_vs_nonbranded = gsc.get_branded_vs_nonbranded_monthly(months=months)

            self._emit_progress(PipelineStep.COLLECT_GSC, "GSC data collected", is_complete=True)

            # Step 2: Collect GA4 Data
            self._emit_progress(PipelineStep.COLLECT_GA4, "Collecting GA4 channel data...")
            channels = []
            if self.company.ga4_property_id:
                try:
                    ga4 = GA4Service(property_id=self.company.ga4_property_id)
                    channels = ga4.get_monthly_channel_comparison(months=months)
                    self._emit_progress(PipelineStep.COLLECT_GA4, "GA4 data collected", is_complete=True)
                except Exception as e:
                    logger.warning("GA4 collection failed: %s", e)
                    self._emit_progress(PipelineStep.COLLECT_GA4, f"GA4 skipped: {e}", is_complete=True)
            else:
                self._emit_progress(PipelineStep.COLLECT_GA4, "No GA4 property configured", is_complete=True)

            # Step 3: Fetch Core Web Vitals (PageSpeed Insights)
            self._emit_progress(PipelineStep.COLLECT_PAGESPEED, "Fetching Core Web Vitals data...")
            analyzed_cwv = None
            try:
                from collectors.pagespeed_service import PageSpeedService
                from report_generator.cwv_analyzer import analyze_cwv
                pagespeed = PageSpeedService()
                raw_cwv = pagespeed.get_core_web_vitals(self.company.url_speedvital or self.company.gsc_url)
                analyzed_cwv = analyze_cwv(raw_cwv)
                self._emit_progress(PipelineStep.COLLECT_PAGESPEED, "Core Web Vitals collected", is_complete=True)
            except Exception as e:
                logger.warning("Core Web Vitals collection failed: %s", e)
                self._emit_progress(PipelineStep.COLLECT_PAGESPEED, f"Core Web Vitals skipped: {e}", is_complete=True)

            # Step 4: Build SEO Data
            self._emit_progress(PipelineStep.BUILD_DATA, "Building SEO dataset...")

            month_label = list(traffic.keys())[-1] if traffic else "Unknown"

            self.seo_data = {
                "generated_at": date.today().isoformat(),
                "site_url": self.company.gsc_url,
                "report_period": {
                    "start": start_date,
                    "end": end_date,
                },
                "traffic": {
                    "monthly": traffic,
                    "branded_vs_nonbranded": branded_vs_nonbranded,
                },
                "pages": pages,
                "page_gainers": page_deltas["gainers"],
                "page_decliners": page_deltas["decliners"],
                "keywords": {
                    "branded": branded_kw[:10],
                    "non_branded": non_branded_kw[:10],
                },
                "channels": channels,
                "core_web_vitals": analyzed_cwv,
                "form_fills": [],
                "insights": {},
            }

            # Save SEO data
            seo_data_path = settings.output_dir / f"seo_data_{self.company_key}.json"
            seo_data_path.parent.mkdir(parents=True, exist_ok=True)
            with open(seo_data_path, "w", encoding="utf-8") as f:
                json.dump(self.seo_data, f, indent=2)

            self._emit_progress(PipelineStep.BUILD_DATA, "SEO dataset built", is_complete=True)

            # Step 4: Generate Charts
            self._emit_progress(PipelineStep.GENERATE_CHARTS, "Generating charts...")

            charts_dir = settings.charts_dir / self.company_key
            chart_gen = ChartGenerator(self.company, charts_dir)
            self.chart_paths = chart_gen.generate_all(self.seo_data)

            self._emit_progress(PipelineStep.GENERATE_CHARTS, "Charts generated", is_complete=True)

            # Step 5: Generate AI Insights
            self._emit_progress(PipelineStep.GENERATE_INSIGHTS, "Generating AI insights...")

            if self.skip_llm or not settings.llm_api_key:
                logger.warning("Skipping LLM generation - using placeholders")
                self.texts = {
                    "six_month_summary": "Six-month SEO summary. [Set ANTHROPIC_AUTH_TOKEN to generate]",
                    "monthly_summary": "Monthly SEO summary. [Set ANTHROPIC_AUTH_TOKEN to generate]",
                    "content_trending_up": "Content trending up analysis. [Set ANTHROPIC_AUTH_TOKEN to generate]",
                    "content_trending_down": "Content trending down analysis. [Set ANTHROPIC_AUTH_TOKEN to generate]",
                    "branded_kw_analysis": "Branded keyword analysis. [Set ANTHROPIC_AUTH_TOKEN to generate]",
                    "nonbranded_kw_analysis": "Non-branded keyword analysis. [Set ANTHROPIC_AUTH_TOKEN to generate]",
                    "channels_summary": "Channel summary. [Set ANTHROPIC_AUTH_TOKEN to generate]",
                }
            else:
                ai_gen = AIInsightGenerator(model=self.model) if self.model else AIInsightGenerator()
                self.texts = ai_gen.generate_all_insights(self.seo_data, self.company_key)

            self._emit_progress(PipelineStep.GENERATE_INSIGHTS, "AI insights generated", is_complete=True)

            # Step 6: Build PPTX
            self._emit_progress(PipelineStep.BUILD_PPTX, "Building PowerPoint report...")

            pptx_gen = PPTXGenerator(self.company, charts_dir)

            # Determine output path
            output_dir = settings.reports_dir / self.company.name.replace(" ", "_")
            output_path = output_dir / f"SEO_Report_{self.company.name.replace(' ', '_')}_{month_label.replace(' ', '_')}.pptx"

            final_path = pptx_gen.generate(self.seo_data, self.texts, output_path, self.slide_list)

            self._emit_progress(PipelineStep.BUILD_PPTX, "PowerPoint report complete", is_complete=True)

            logger.info("Pipeline completed successfully: %s", final_path)

            return PipelineResult(
                success=True,
                company_key=self.company_key,
                company_name=self.company.name,
                output_path=final_path,
                seo_data_path=seo_data_path,
            )

        except Exception as e:
            error_msg = str(e)
            tb = traceback.format_exc()
            logger.error("Pipeline failed for %s: %s", self.company_key, error_msg)
            logger.debug(tb)

            return PipelineResult(
                success=False,
                company_key=self.company_key,
                company_name=self.company.name if self.company else "Unknown",
                error_message=error_msg,
                traceback=tb,
            )


def get_previous_reports(company_name: str) -> List[Dict[str, Any]]:
    """Get list of previous reports for a company."""
    reports_dir = settings.reports_dir / company_name.replace(" ", "_")
    if not reports_dir.exists():
        return []

    reports = []
    for pptx_file in sorted(reports_dir.glob("*.pptx"), reverse=True):
        stat = pptx_file.stat()
        reports.append({
            "filename": pptx_file.name,
            "path": str(pptx_file),
            "size_mb": round(stat.st_size / (1024 * 1024), 2),
            "modified_date": date.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d"),
        })

    return reports
