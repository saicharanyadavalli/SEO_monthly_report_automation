"""SEO Data Builder - prepares structured data for reports."""
from __future__ import annotations

import json
import logging
from datetime import date, timedelta
from pathlib import Path
from typing import Any, Dict, List

from dateutil.relativedelta import relativedelta

from config.models import CompanyConfig
from config.settings import settings
from collectors.gsc_service import GSCService
from collectors.ga4_service import GA4Service
from collectors.pagespeed_service import PageSpeedService
from report_generator.cwv_analyzer import analyze_cwv

logger = logging.getLogger(__name__)


class SEODataBuilder:
    """Builds structured SEO data from collected metrics."""

    def __init__(self, company: CompanyConfig) -> None:
        self.company = company
        self.gsc = GSCService(
            site_url=company.gsc_url,
            brand_terms=company.brand_terms,
        )
        self.ga4 = None
        if company.ga4_property_id:
            try:
                self.ga4 = GA4Service(property_id=company.ga4_property_id)
            except Exception as e:
                logger.warning("Could not initialize GA4 service: %s", e)
        self.pagespeed = PageSpeedService()

    def build(self, months: int = 6) -> Dict[str, Any]:
        """Build the complete SEO dataset."""
        logger.info("Building SEO dataset for %s", self.company.name)

        # Calculate date ranges
        today = date.today()
        report_end_date = today.replace(day=1) - timedelta(days=1)
        start_date = (report_end_date.replace(day=1) - relativedelta(months=months - 1)).strftime("%Y-%m-%d")
        end_date = report_end_date.strftime("%Y-%m-%d")
        month_start_date = report_end_date.replace(day=1).strftime("%Y-%m-%d")

        # Collect GSC data
        traffic = self.gsc.get_monthly_traffic(months=months)
        pages = self.gsc.get_top_pages(month_start_date, end_date, limit=10)
        page_deltas = self.gsc.get_page_click_delta(limit=10)
        branded_kw = self.gsc.get_branded_keywords(month_start_date, end_date)
        non_branded_kw = self.gsc.get_non_branded_keywords(month_start_date, end_date)
        branded_vs_nonbranded = self.gsc.get_branded_vs_nonbranded_monthly(months=months)

        # Collect GA4 data if available
        channels = []
        if self.ga4:
            try:
                channels = self.ga4.get_monthly_channel_comparison(months=months)
            except Exception as e:
                logger.warning("Could not fetch GA4 data: %s", e)

        # Collect PageSpeed Core Web Vitals
        raw_cwv = None
        try:
            raw_cwv = self.pagespeed.get_core_web_vitals(self.company.url_speedvital or self.company.gsc_url)
        except Exception as e:
            logger.warning("Could not fetch Core Web Vitals data: %s", e)
        analyzed_cwv = analyze_cwv(raw_cwv)

        # Build the complete data structure
        data = {
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

        logger.info("SEO dataset built successfully")
        return data

    def get_queries_month(self, limit: int = 500) -> List[Dict[str, Any]]:
        """Get queries for the last month."""
        return self.gsc.get_queries_last_month(limit=limit)

    def get_queries_6_months(self, limit: int = 500) -> List[Dict[str, Any]]:
        """Get queries for the last 6 months."""
        return self.gsc.get_queries_last_6_months(limit=limit)

    def save_data(
        self,
        data: Dict[str, Any],
        output_path: Path | None = None,
    ) -> Path:
        """Save the SEO data to a JSON file."""
        if output_path is None:
            output_path = settings.output_dir / f"seo_data_{self.company.key}.json"

        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

        logger.info("Saved SEO data to %s", output_path)
        return output_path
