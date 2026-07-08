"""Google PageSpeed Insights API data collection service."""
from __future__ import annotations

import logging
from typing import Any, Dict, Optional

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception

from config.settings import settings

logger = logging.getLogger(__name__)


def _retry_condition(exception: BaseException) -> bool:
    """Determine whether to retry on API call exception."""
    if isinstance(exception, httpx.HTTPStatusError):
        # Do not retry on client errors like 403 Forbidden or 429 Too Many Requests
        return exception.response.status_code not in (403, 429)
    return isinstance(exception, (httpx.RequestError, httpx.TimeoutException))


class PageSpeedService:
    """Service for collecting data from Google PageSpeed Insights API."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        strategy: Optional[str] = None,
    ) -> None:
        self.api_key = api_key or settings.google_api_key
        self.strategy = strategy or settings.pagespeed_strategy
        self.endpoint = "https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed"

    def get_core_web_vitals(self, url: str) -> Optional[Dict[str, Dict[str, Any]]]:
        """Fetch Core Web Vitals from PageSpeed Insights.

        Handles 403/429 errors gracefully, logging and returning None to prevent crashes.
        """
        if not self.api_key:
            logger.warning("GOOGLE_API_KEY is not set. Skipping Core Web Vitals collection.")
            return None

        # Convert GSC sc-domain: properties to valid URLs for PageSpeed API
        if url.startswith("sc-domain:"):
            url = "https://" + url.replace("sc-domain:", "")

        try:
            return self._query_api(url)
        except httpx.HTTPStatusError as exc:
            status_code = exc.response.status_code
            if status_code in (403, 429):
                logger.warning(
                    "PageSpeed API returned status %d. Skipping Core Web Vitals: %s",
                    status_code,
                    exc.response.text,
                )
                return None
            logger.error("HTTP status error during PageSpeed API call: %s", exc)
            return None
        except Exception as exc:
            logger.error("Unexpected error during PageSpeed API call: %s", exc)
            return None

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception(_retry_condition),
        reraise=True,
    )
    def _query_api(self, url: str) -> Dict[str, Dict[str, Any]]:
        """Query the PageSpeed Insights API with retries."""
        params = {
            "url": url,
            "category": "performance",
            "strategy": self.strategy,
            "key": self.api_key,
        }
        logger.info("Querying PageSpeed API for URL: %s with strategy: %s", url, self.strategy)

        # 60s timeout for Lighthouse run
        response = httpx.get(self.endpoint, params=params, timeout=60.0)
        response.raise_for_status()

        data = response.json()
        lighthouse_result = data.get("lighthouseResult", {})
        audits = lighthouse_result.get("audits", {})

        if not audits:
            raise ValueError("No audits found in PageSpeed Insights response.")

        # Extract values
        fcp_val = audits.get("first-contentful-paint", {}).get("numericValue")
        lcp_val = audits.get("largest-contentful-paint", {}).get("numericValue")
        tbt_val = audits.get("total-blocking-time", {}).get("numericValue")
        cls_val = audits.get("cumulative-layout-shift", {}).get("numericValue")
        si_val = audits.get("speed-index", {}).get("numericValue")

        return {
            "fcp": {"value": fcp_val / 1000.0 if fcp_val is not None else None, "unit": "s"},
            "lcp": {"value": lcp_val / 1000.0 if lcp_val is not None else None, "unit": "s"},
            "tbt": {"value": tbt_val if tbt_val is not None else None, "unit": "ms"},
            "cls": {"value": cls_val if cls_val is not None else None, "unit": ""},
            "si": {"value": si_val / 1000.0 if si_val is not None else None, "unit": "s"},
        }
