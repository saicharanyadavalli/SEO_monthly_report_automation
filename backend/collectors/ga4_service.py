"""Google Analytics 4 data collection service."""
from __future__ import annotations

import json
import logging
import os
import pickle
from dataclasses import dataclass, field
from datetime import date, timedelta
from pathlib import Path
from typing import Any, Dict, List

from dateutil.relativedelta import relativedelta
from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import DateRange, Dimension, Metric, RunReportRequest
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import InstalledAppFlow
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from config.settings import settings

logger = logging.getLogger(__name__)


@dataclass
class MonthlyChannelComparison:
    """Monthly channel comparison data."""
    month: str
    Google: int = 0
    ChatGPT: int = 0
    Bing: int = 0
    LinkedIn: int = 0
    Perplexity: int = 0
    Direct: int = 0
    Email: int = 0
    Claude: int = 0

    def as_dict(self) -> Dict[str, Any]:
        return {
            "month": self.month,
            "Google": self.Google,
            "ChatGPT": self.ChatGPT,
            "Bing": self.Bing,
            "LinkedIn": self.LinkedIn,
            "Perplexity": self.Perplexity,
            "Direct": self.Direct,
            "Email": self.Email,
            "Claude": self.Claude,
        }


class GA4Service:
    """Service for collecting data from Google Analytics 4."""

    def __init__(self, property_id: str) -> None:
        self.property_id = property_id.strip()
        if not self.property_id:
            raise ValueError("GA4 property ID is required")
        self.credentials = self._authenticate()
        self.client = BetaAnalyticsDataClient(credentials=self.credentials)

    def _authenticate(self):
        """Authenticate with Google Analytics API."""
        creds = None
        token_path = str(settings.token_full_path)
        client_secret_path = str(settings.client_secret_full_path)

        if os.path.exists(token_path):
            with open(token_path, "rb") as token:
                creds = pickle.load(token)
            active_scopes = set(getattr(creds, "scopes", []) or [])
            if not set(settings.scopes).issubset(active_scopes):
                logger.info("Re-authenticating with GA4 scope...")
                try:
                    os.remove(token_path)
                except OSError:
                    pass
                creds = None

        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                flow = InstalledAppFlow.from_client_secrets_file(
                    client_secret_path, settings.scopes
                )
                creds = flow.run_local_server(port=0)
            with open(token_path, "wb") as token:
                pickle.dump(creds, token)

        logger.info("GA4 authentication successful")
        return creds

    def _month_ranges(self, months: int) -> List[tuple]:
        """Calculate month boundary dates."""
        today = (date.today().replace(day=1) - timedelta(days=1)).replace(day=1)
        ranges = []
        for idx in range(months - 1, -1, -1):
            start_dt = today - relativedelta(months=idx)
            end_dt = (start_dt + relativedelta(months=1)) - timedelta(days=1)
            ranges.append((start_dt, end_dt))
        return ranges

    def _category_from_source_medium(self, source_medium: str) -> str | None:
        """Map source/medium to channel category."""
        value = source_medium.strip().lower()
        google_sources = {
            "google / organic", "google / cpc", "google / ads",
            "google.com / referral", "gemini.google.com / referral",
            "notebooklm.google.com / referral", "vertexaisearch.cloud.google / referral",
        }
        if value in google_sources:
            return "Google"
        if value in {"chatgpt.com / referral", "chatgpt.com / organic", "chatgpt.com / (not set)"}:
            return "ChatGPT"
        if value == "bing / organic":
            return "Bing"
        if value in {"linkedin / organic_social", "linkedin.com / referral", "lnkd.in / referral"}:
            return "LinkedIn"
        if value in {"perplexity.ai / referral", "perplexity / (not set)"}:
            return "Perplexity"
        if value == "(direct) / (none)":
            return "Direct"
        if "email" in value:
            return "Email"
        if value == "claude.ai / referral":
            return "Claude"
        return None

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(Exception),
    )
    def _run_report(self, start_date: str, end_date: str):
        """Execute a GA4 report request."""
        request = RunReportRequest(
            property=f"properties/{self.property_id}",
            date_ranges=[DateRange(start_date=start_date, end_date=end_date)],
            dimensions=[Dimension(name="sessionSourceMedium")],
            metrics=[Metric(name="sessions")],
            limit=100,
        )
        return self.client.run_report(request)

    def get_monthly_channel_comparison(
        self, months: int = 6
    ) -> List[Dict[str, Any]]:
        """Get monthly channel comparison data."""
        results = []

        for start_dt, end_dt in self._month_ranges(months):
            month_label = start_dt.strftime("%b %Y")
            logger.info("Fetching GA4 data for %s...", month_label)

            try:
                response = self._run_report(
                    start_dt.strftime("%Y-%m-%d"),
                    end_dt.strftime("%Y-%m-%d")
                )
            except Exception as e:
                logger.error("Failed to fetch GA4 data for %s: %s", month_label, e)
                results.append(MonthlyChannelComparison(month=month_label).as_dict())
                continue

            row_map = MonthlyChannelComparison(month=month_label)

            for row in getattr(response, "rows", []) or []:
                source_medium = row.dimension_values[0].value if row.dimension_values else ""
                sessions = int(float(row.metric_values[0].value)) if row.metric_values else 0
                category = self._category_from_source_medium(source_medium)

                if category:
                    current = getattr(row_map, category)
                    setattr(row_map, category, current + sessions)

            results.append(row_map.as_dict())

        logger.info("Collected GA4 channel data for %d months", len(results))
        return results
