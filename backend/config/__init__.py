"""Configuration module for SEO Report System."""
from .settings import Settings, settings
from .models import CompanyConfig, get_all_companies, get_company

__all__ = ["Settings", "settings", "CompanyConfig", "get_all_companies", "get_company"]
