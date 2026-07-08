"""
Generate SEO Report for a single company.

Usage:
    python generate_report.py <company_key>

Examples:
    python generate_report.py superk
    python generate_report.py lendfoundry
    python generate_report.py sigmainfo
"""
from __future__ import annotations

import logging
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

from config.models import get_company
from config.settings import settings
from report_generator.pipeline import ReportPipeline

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


def generate_report(company_key: str, skip_llm: bool = False) -> None:
    """Generate SEO report for a specific company."""

    # Verify company exists
    company = get_company(company_key)
    if not company:
        print(f"Error: Company '{company_key}' not found in configuration.")
        print("\nAvailable companies:")
        from config.models import get_all_companies
        for key, comp in get_all_companies().items():
            print(f"  - {key}: {comp.name}")
        sys.exit(1)

    print(f"\n{'='*60}")
    print(f"SEO Report Generator")
    print(f"{'='*60}")
    print(f"Company: {company.name}")
    print(f"Website: {company.gsc_url}")
    print(f"Skip AI: {skip_llm}")
    print(f"{'='*60}\n")

    def progress_callback(prog):
        status = "Done" if prog.is_complete else "Processing..."
        print(f"[Step {prog.current}/{prog.total}] {prog.step_name}: {status}")

    # Run pipeline
    pipeline = ReportPipeline(
        company_key=company_key,
        progress_callback=progress_callback,
        skip_llm=skip_llm,
    )

    result = pipeline.run()

    print(f"\n{'='*60}")
    if result.success:
        print("Report generated successfully!")
        print(f"Output: {result.output_path}")
        if result.seo_data_path:
            print(f"SEO Data: {result.seo_data_path}")
    else:
        print("Report generation failed!")
        print(f"Error: {result.error_message}")
        if result.traceback:
            print(f"\nTraceback:\n{result.traceback}")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python generate_report.py <company_key> [--skip-llm]")
        print("\nExample:")
        print("  python generate_report.py superk")
        print("  python generate_report.py lendfoundry --skip-llm")
        sys.exit(1)

    company_key = sys.argv[1]
    skip_llm = "--skip-llm" in sys.argv

    generate_report(company_key, skip_llm)
