"""Company configuration models."""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional


@dataclass
class CompanyConfig:
    """Configuration for a single company."""

    key: str
    name: str
    gsc_url: str  # GSC property URL (e.g., sc-domain:example.com or https://example.com/)
    url_speedvital: str = ""  # Optional: URL for PageSpeed Insights (if different from GSC URL)
    header_color: str = "#8DC321"
    accent_color: str = "#3AA378"
    ga4_property_id: str = ""
    brand_terms: List[str] = field(default_factory=list)

    @classmethod
    def from_dict(cls, key: str, data: Dict) -> CompanyConfig:
        return cls(
            key=key,
            name=data.get("name", key),
            gsc_url=data.get("gsc_url", ""),
            url_speedvital=data.get("url_speedvital", ""),
            header_color=data.get("header_color", "#8DC321"),
            accent_color=data.get("accent_color", "#3AA378"),
            ga4_property_id=data.get("ga4_property_id", ""),
            brand_terms=data.get("brand_terms", []),
        )

    def to_dict(self) -> Dict:
        return {
            "name": self.name,
            "gsc_url": self.gsc_url,
            "url_speedvital": self.url_speedvital,
            "header_color": self.header_color,
            "accent_color": self.accent_color,
            "ga4_property_id": self.ga4_property_id,
            "brand_terms": self.brand_terms,
        }


def _load_company_config() -> Dict[str, CompanyConfig]:
    """Load company configurations from JSON file."""
    config_path = Path(__file__).parent.parent / "company_config.json"
    if not config_path.exists():
        return {}

    with open(config_path, encoding="utf-8") as f:
        data = json.load(f)

    companies = data.get("companies", {})
    return {
        key: CompanyConfig.from_dict(key, config)
        for key, config in companies.items()
    }


# Cache for company configurations
_companies_cache: Optional[Dict[str, CompanyConfig]] = None


def get_all_companies() -> Dict[str, CompanyConfig]:
    """Get all company configurations."""
    global _companies_cache
    if _companies_cache is None:
        _companies_cache = _load_company_config()
    return _companies_cache


def get_company(key: str) -> Optional[CompanyConfig]:
    """Get a specific company configuration by key."""
    return get_all_companies().get(key.lower())


def reload_companies() -> None:
    """Reload company configurations from file."""
    global _companies_cache
    _companies_cache = None
    get_all_companies()
