"""Application settings and configuration."""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import List

from dotenv import load_dotenv

load_dotenv()


@dataclass
class Settings:
    """Central configuration for the SEO Report System."""

    # API Credentials
    client_secret_path: str = "client_secret.json"
    token_path: str = "token.pickle"

    # Google API Scopes
    scopes: List[str] = field(default_factory=lambda: [
        "https://www.googleapis.com/auth/webmasters.readonly",
        "https://www.googleapis.com/auth/analytics.readonly",
    ])

    # Report Configuration
    report_months: int = 6
    query_compare_days: int = 28
    query_limit: int = 500

    # LLM Configuration
    llm_base_url: str = os.getenv("ANTHROPIC_BASE_URL", "https://api.anthropic.com")
    llm_api_key: str = os.getenv("ANTHROPIC_AUTH_TOKEN", "")
    llm_model: str = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")

    # PageSpeed Insights Configuration
    google_api_key: str = os.getenv("GOOGLE_API_KEY", "")
    pagespeed_strategy: str = "mobile"

    # Directory Configuration
    base_dir: Path = field(default_factory=lambda: Path(__file__).parent.parent)
    output_dir: Path = field(init=False)
    reports_dir: Path = field(init=False)
    charts_dir: Path = field(init=False)

    def __post_init__(self):
        self.output_dir = self.base_dir / "output"
        self.reports_dir = self.base_dir / "reports"
        self.charts_dir = self.base_dir / "output" / "charts"
        self.output_dir.mkdir(exist_ok=True)
        self.reports_dir.mkdir(exist_ok=True)
        self.charts_dir.mkdir(parents=True, exist_ok=True)

    @property
    def client_secret_full_path(self) -> Path:
        return self.base_dir / self.client_secret_path

    @property
    def token_full_path(self) -> Path:
        return self.base_dir / self.token_path


# Global settings instance
settings = Settings()
