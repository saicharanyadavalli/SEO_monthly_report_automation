"""Google Search Console data collection service."""
from __future__ import annotations

import json
import logging
import os
import pickle
from dataclasses import dataclass
from datetime import date, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

from dateutil.relativedelta import relativedelta
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from config.settings import settings

logger = logging.getLogger(__name__)


@dataclass
class GSCQueryRow:
    """Represents a single query row from GSC."""
    query: str
    clicks: int
    impressions: int
    ctr: float
    position: float
    is_branded: bool = False


@dataclass
class GSCPageRow:
    """Represents a single page row from GSC."""
    url: str
    title: str
    clicks: int
    impressions: int
    ctr: float
    position: float


class GSCService:
    """Service for collecting data from Google Search Console."""

    def __init__(
        self,
        site_url: str,
        brand_terms: List[str],
    ) -> None:
        self.site_url = site_url
        self.brand_terms = [term.lower() for term in brand_terms]
        self.service = self._authenticate()

    def _authenticate(self):
        """Authenticate with Google Search Console API."""
        creds = None
        token_path = str(settings.token_full_path)
        client_secret_path = str(settings.client_secret_full_path)

        if os.path.exists(token_path):
            with open(token_path, "rb") as token:
                creds = pickle.load(token)
            if creds and getattr(creds, "scopes", None):
                required_scopes = set(settings.scopes)
                active_scopes = set(creds.scopes or [])
                if not required_scopes.issubset(active_scopes):
                    logger.info("Token has outdated scopes, re-authenticating...")
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

        logger.info("GSC authentication successful")
        return build("searchconsole", "v1", credentials=creds, cache_discovery=False)

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(HttpError),
    )
    def _query_api(self, request_body: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a GSC API query with retry logic."""
        logger.debug("GSC request: %s", request_body)
        try:
            response = self.service.searchanalytics().query(
                siteUrl=self.site_url, body=request_body
            ).execute()
            return response
        except HttpError as exc:
            status = getattr(exc.resp, "status", "unknown")
            logger.error("GSC API error: status=%s", status)
            raise

    def _extract_rows(self, response: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract rows from GSC API response."""
        if "rows" not in response:
            logger.warning("GSC response missing 'rows' key")
            return []
        return response.get("rows", [])

    def _month_bounds(self, months_back: int) -> List[tuple]:
        """Calculate month boundary dates."""
        today = (date.today().replace(day=1) - timedelta(days=1)).replace(day=1)
        months = []
        for i in range(months_back - 1, -1, -1):
            month_start = today - relativedelta(months=i)
            month_end = (month_start + relativedelta(months=1)) - timedelta(days=1)
            months.append((month_start, month_end))
        return months

    def _is_branded(self, query: str) -> bool:
        """Check if a query matches brand terms."""
        query_lower = query.lower()
        return any(term in query_lower for term in self.brand_terms)

    def _slug_to_name(self, url: str) -> str:
        """Convert URL slug to readable name."""
        path = url.split("?", 1)[0].rstrip("/")
        slug = path.rsplit("/", 1)[-1] if path else ""
        if not slug:
            return url
        slug = slug.replace("-", " ").replace("_", " ")
        return " ".join(part for part in slug.split() if part)

    def _is_blog_page(self, url: str) -> bool:
        """Check if URL is a blog page."""
        path = url.split("?", 1)[0].lower()
        return any(keyword in path for keyword in ("blog", "article", "post"))

    # === Public API Methods ===

    def get_monthly_traffic(self, months: int = 6) -> Dict[str, Dict[str, Any]]:
        """Get monthly traffic metrics for the specified number of months."""
        result = {}
        for start_dt, end_dt in self._month_bounds(months):
            request_body = {
                "startDate": start_dt.strftime("%Y-%m-%d"),
                "endDate": end_dt.strftime("%Y-%m-%d"),
                "dimensions": ["date"],
                "rowLimit": 25000,
                "startRow": 0,
            }
            response = self._query_api(request_body)
            rows = self._extract_rows(response)

            clicks = sum(int(row.get("clicks", 0)) for row in rows)
            impressions = sum(int(row.get("impressions", 0)) for row in rows)
            ctr = (clicks / impressions) if impressions else 0.0
            position_weighted = 0.0
            if impressions:
                position_weighted = sum(
                    float(row.get("position", 0.0)) * int(row.get("impressions", 0))
                    for row in rows
                ) / impressions

            month_name = start_dt.strftime("%B %Y")
            result[month_name] = {
                "clicks": clicks,
                "impressions": impressions,
                "ctr": ctr,
                "position": position_weighted,
            }

        logger.info("Collected monthly traffic for %d months", len(result))
        return result

    def get_top_pages(
        self, start_date: str, end_date: str, limit: int = 10
    ) -> Dict[str, List[Dict[str, Any]]]:
        """Get top pages for a date range."""
        request_body = {
            "startDate": start_date,
            "endDate": end_date,
            "dimensions": ["page"],
            "rowLimit": 25000,
            "startRow": 0,
        }
        response = self._query_api(request_body)
        rows = self._extract_rows(response)

        pages = []
        for row in rows:
            url = row.get("keys", [""])[0].rstrip("/")
            pages.append({
                "url": url,
                "title": self._slug_to_name(url),
                "clicks": int(row.get("clicks", 0)),
                "impressions": int(row.get("impressions", 0)),
                "ctr": float(row.get("ctr", 0.0)),
                "position": float(row.get("position", 0.0)),
            })

        blog_pages = [p for p in pages if self._is_blog_page(p["url"])]
        non_blog_pages = [p for p in pages if not self._is_blog_page(p["url"])]
        blog_pages.sort(key=lambda x: x["clicks"], reverse=True)
        non_blog_pages.sort(key=lambda x: x["clicks"], reverse=True)

        logger.info(
            "Collected %d blog pages and %d non-blog pages",
            len(blog_pages[:limit]),
            len(non_blog_pages[:limit]),
        )
        return {
            "blog_pages": blog_pages[:limit],
            "non_blog_pages": non_blog_pages[:limit],
        }

    def get_page_click_delta(
        self, limit: int = 10, compare_days: int = 28
    ) -> Dict[str, List[Dict[str, Any]]]:
        """Get pages with biggest click changes."""
        today = date.today()
        current_start = today - timedelta(days=compare_days - 1)
        previous_end = current_start - timedelta(days=1)
        previous_start = previous_end - timedelta(days=compare_days - 1)

        current_body = {
            "startDate": current_start.strftime("%Y-%m-%d"),
            "endDate": today.strftime("%Y-%m-%d"),
            "dimensions": ["page"],
            "rowLimit": 25000,
            "startRow": 0,
        }
        previous_body = {
            "startDate": previous_start.strftime("%Y-%m-%d"),
            "endDate": previous_end.strftime("%Y-%m-%d"),
            "dimensions": ["page"],
            "rowLimit": 25000,
            "startRow": 0,
        }

        current_rows = self._extract_rows(self._query_api(current_body))
        previous_rows = self._extract_rows(self._query_api(previous_body))

        current_map = {}
        previous_map = {}

        for row in current_rows:
            page = row.get("keys", [""])[0].strip().rstrip("/")
            current_map[page] = {"clicks": int(row.get("clicks", 0))}

        for row in previous_rows:
            page = row.get("keys", [""])[0].strip().rstrip("/")
            previous_map[page] = {"clicks": int(row.get("clicks", 0))}

        all_pages = set(current_map) | set(previous_map)
        deltas = []
        for page in all_pages:
            current_clicks = current_map.get(page, {}).get("clicks", 0)
            previous_clicks = previous_map.get(page, {}).get("clicks", 0)
            delta = current_clicks - previous_clicks
            deltas.append({
                "page": page,
                "current_clicks": current_clicks,
                "previous_clicks": previous_clicks,
                "click_delta": delta,
            })

        gainers = [d for d in deltas if d["click_delta"] > 0]
        decliners = [d for d in deltas if d["click_delta"] < 0]
        gainers.sort(key=lambda x: x["click_delta"], reverse=True)
        decliners.sort(key=lambda x: x["click_delta"])

        logger.info(
            "Found %d gainers and %d decliners",
            len(gainers[:limit]),
            len(decliners[:limit]),
        )
        return {
            "gainers": gainers[:limit],
            "decliners": decliners[:limit],
        }

    def get_branded_keywords(
        self, start_date: str, end_date: str
    ) -> List[Dict[str, Any]]:
        """Get branded keywords for a date range."""
        request_body = {
            "startDate": start_date,
            "endDate": end_date,
            "dimensions": ["query"],
            "rowLimit": 25000,
            "startRow": 0,
        }
        response = self._query_api(request_body)
        rows = self._extract_rows(response)

        branded = []
        for row in rows:
            query = row.get("keys", [""])[0]
            if self._is_branded(query):
                branded.append({
                    "query": query,
                    "clicks": int(row.get("clicks", 0)),
                    "impressions": int(row.get("impressions", 0)),
                    "ctr": float(row.get("ctr", 0.0)),
                    "position": float(row.get("position", 0.0)),
                })

        branded.sort(key=lambda x: x["clicks"], reverse=True)
        logger.info("Found %d branded keywords", len(branded))
        return branded

    def get_non_branded_keywords(
        self, start_date: str, end_date: str
    ) -> List[Dict[str, Any]]:
        """Get non-branded keywords for a date range."""
        request_body = {
            "startDate": start_date,
            "endDate": end_date,
            "dimensions": ["query"],
            "rowLimit": 25000,
            "startRow": 0,
        }
        response = self._query_api(request_body)
        rows = self._extract_rows(response)

        non_branded = []
        for row in rows:
            query = row.get("keys", [""])[0]
            if not self._is_branded(query):
                non_branded.append({
                    "query": query,
                    "clicks": int(row.get("clicks", 0)),
                    "impressions": int(row.get("impressions", 0)),
                    "ctr": float(row.get("ctr", 0.0)),
                    "position": float(row.get("position", 0.0)),
                })

        non_branded.sort(key=lambda x: x["clicks"], reverse=True)
        logger.info("Found %d non-branded keywords", len(non_branded))
        return non_branded

    def get_branded_vs_nonbranded_monthly(
        self, months: int = 6
    ) -> Dict[str, Dict[str, int]]:
        """Get monthly branded vs non-branded click split."""
        result = {}
        for start_dt, end_dt in self._month_bounds(months):
            request_body = {
                "startDate": start_dt.strftime("%Y-%m-%d"),
                "endDate": end_dt.strftime("%Y-%m-%d"),
                "dimensions": ["query"],
                "rowLimit": 25000,
                "startRow": 0,
            }
            response = self._query_api(request_body)
            rows = self._extract_rows(response)

            branded = 0
            non_branded = 0
            for row in rows:
                clicks = int(row.get("clicks", 0))
                query = row.get("keys", [""])[0]
                if self._is_branded(query):
                    branded += clicks
                else:
                    non_branded += clicks

            result[start_dt.strftime("%B %Y")] = {
                "branded": branded,
                "non_branded": non_branded,
            }

        logger.info("Collected branded vs non-branded data for %d months", len(result))
        return result

    def get_queries_for_period(
        self, start_date: str, end_date: str, limit: int = 500
    ) -> List[Dict[str, Any]]:
        """Get all queries for a specific date range."""
        request_body = {
            "startDate": start_date,
            "endDate": end_date,
            "dimensions": ["query"],
            "rowLimit": 25000,
            "startRow": 0,
        }
        response = self._query_api(request_body)
        rows = self._extract_rows(response)

        queries = []
        for row in rows:
            query = row.get("keys", [""])[0]
            queries.append({
                "query": query,
                "clicks": int(row.get("clicks", 0)),
                "impressions": int(row.get("impressions", 0)),
                "ctr": float(row.get("ctr", 0.0)),
                "position": float(row.get("position", 0.0)),
                "is_branded": self._is_branded(query),
            })

        queries.sort(key=lambda x: x["clicks"], reverse=True)
        logger.info("Collected %d queries for period %s to %s", len(queries[:limit]), start_date, end_date)
        return queries[:limit]

    def get_queries_last_month(self, limit: int = 500) -> List[Dict[str, Any]]:
        """Get queries for the last completed month."""
        today = date.today()
        report_end_date = today.replace(day=1) - timedelta(days=1)
        month_start = report_end_date.replace(day=1)
        start_date = month_start.strftime("%Y-%m-%d")
        end_date = report_end_date.strftime("%Y-%m-%d")
        return self.get_queries_for_period(start_date, end_date, limit)

    def get_queries_last_6_months(self, limit: int = 500) -> List[Dict[str, Any]]:
        """Get queries for the last 6 months."""
        today = date.today()
        report_end_date = today.replace(day=1) - timedelta(days=1)
        start_date = (report_end_date.replace(day=1) - relativedelta(months=5)).strftime("%Y-%m-%d")
        end_date = report_end_date.strftime("%Y-%m-%d")
        return self.get_queries_for_period(start_date, end_date, limit)
