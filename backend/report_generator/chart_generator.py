"""Chart Generator - creates PNG charts for reports."""
from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any, Dict

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
import numpy as np

from config.models import CompanyConfig
from config.settings import settings

logger = logging.getLogger(__name__)

# Chart colors
BRANDED_COLOR = "#4472C4"
NONBRANDED_COLOR = "#ED3B3B"
DARK = "#333333"
GRAY = "#DDDDDD"
BG = "#FFFFFF"


class ChartGenerator:
    """Generates chart PNGs for SEO reports."""

    def __init__(self, company: CompanyConfig, output_dir: Path | None = None) -> None:
        self.company = company
        self.output_dir = output_dir or settings.charts_dir
        self.output_dir.mkdir(parents=True, exist_ok=True)

        # Convert hex colors to RGB
        self.primary_color = self._hex_to_rgb(company.header_color)
        self.accent_color = self._hex_to_rgb(company.accent_color)

        # Setup matplotlib
        plt.rcParams.update({
            "font.family": "DejaVu Sans",
            "font.size": 9,
            "axes.titlesize": 10,
            "axes.labelsize": 9,
            "xtick.labelsize": 8,
            "ytick.labelsize": 8,
            "legend.fontsize": 8,
            "figure.facecolor": BG,
            "axes.facecolor": BG,
            "axes.spines.top": False,
            "axes.spines.right": False,
            "axes.grid": True,
            "grid.color": GRAY,
            "grid.linewidth": 0.5,
        })

    def _hex_to_rgb(self, hex_color: str) -> str:
        """Convert hex color to RGB string for matplotlib."""
        return hex_color  # matplotlib accepts hex directly

    def _short_month(self, label: str) -> str:
        """Convert 'January 2026' to 'Jan 26'."""
        parts = label.split()
        if len(parts) >= 2:
            return f"{parts[0][:3]} {parts[1][2:]}"
        return label

    def _savefig(self, fig: plt.Figure, path: Path) -> None:
        """Save figure and close."""
        fig.savefig(path, dpi=150, bbox_inches="tight", facecolor=BG, edgecolor="none")
        plt.close(fig)
        logger.info("Generated: %s", path.name)

    def generate_all(self, data: Dict[str, Any]) -> Dict[str, Path]:
        """Generate all charts and return paths."""
        logger.info("Generating charts for %s", self.company.name)

        charts = {}

        # Chart 1: Clicks only
        charts["chart_clicks_only"] = self._chart_clicks_only(data)

        # Chart 2: Branded vs Non-Branded
        charts["chart_branded_nonbranded"] = self._chart_branded_nonbranded(data)

        # Chart 3: Google vs Direct
        charts["chart_google_direct"] = self._chart_google_direct(data)

        # Chart 4: Other channels
        charts["chart_channels_others"] = self._chart_channels_others(data)

        logger.info("Generated %d charts", len(charts))
        return charts

    def _chart_clicks_only(self, data: Dict) -> Path:
        """Generate clicks bar chart."""
        monthly = data["traffic"]["monthly"]
        months = [self._short_month(m) for m in monthly.keys()]
        clicks = [monthly[m]["clicks"] for m in monthly.keys()]

        x = np.arange(len(months))
        fig, ax = plt.subplots(figsize=(6.5, 3.8))
        bars = ax.bar(x, clicks, color=self.primary_color, width=0.55, zorder=3, edgecolor="white", linewidth=0.5)

        ax.set_xticks(x)
        ax.set_xticklabels(months)
        ax.set_ylabel("Organic Clicks", color=DARK)
        ax.yaxis.set_major_formatter(mticker.FuncFormatter(lambda v, _: f"{int(v):,}"))
        ax.set_title("Monthly Organic Clicks", fontsize=10, color=DARK, pad=6)

        for bar, val in zip(bars, clicks):
            ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 12,
                    f"{val:,}", ha="center", va="bottom", fontsize=8, color=DARK, fontweight="bold")

        fig.tight_layout(pad=0.4)
        path = self.output_dir / "chart_clicks_only.png"
        self._savefig(fig, path)
        return path

    def _chart_branded_nonbranded(self, data: Dict) -> Path:
        """Generate branded vs non-branded chart."""
        bvnb = data["traffic"]["branded_vs_nonbranded"]
        months = [self._short_month(m) for m in bvnb.keys()]
        branded = [bvnb[m]["branded"] for m in bvnb.keys()]
        nonbranded = [bvnb[m]["non_branded"] for m in bvnb.keys()]

        x = np.arange(len(months))
        w = 0.35
        fig, ax = plt.subplots(figsize=(5.5, 3.5))

        b1 = ax.bar(x - w/2, branded, width=w, color=BRANDED_COLOR, label="Branded", zorder=3, edgecolor="white", linewidth=0.4)
        b2 = ax.bar(x + w/2, nonbranded, width=w, color=NONBRANDED_COLOR, label="Non-Branded", zorder=3, edgecolor="white", linewidth=0.4)

        ax.set_xticks(x)
        ax.set_xticklabels(months)
        ax.set_ylabel("Clicks", color=DARK)
        ax.set_title("Branded vs Non-Branded Clicks", fontsize=10, color=DARK, pad=6)
        ax.legend(framealpha=0.9)

        for bar, val in zip(list(b1) + list(b2), branded + nonbranded):
            ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 4,
                    str(val), ha="center", va="bottom", fontsize=7, color=DARK, fontweight="bold")

        fig.tight_layout(pad=0.4)
        path = self.output_dir / "chart_branded_nonbranded.png"
        self._savefig(fig, path)
        return path

    def _chart_google_direct(self, data: Dict) -> Path:
        """Generate Google vs Direct channel chart."""
        channels = data.get("channels", [])
        if not channels:
            # Create placeholder if no data
            path = self.output_dir / "chart_google_direct.png"
            if not path.exists():
                fig, ax = plt.subplots(figsize=(5.0, 3.6))
                ax.text(0.5, 0.5, "No channel data available", ha="center", va="center", fontsize=10)
                ax.set_axis_off()
                self._savefig(fig, path)
            return path

        months = [c["month"] for c in channels]
        google = [c.get("Google", 0) for c in channels]
        direct = [c.get("Direct", 0) for c in channels]

        x = np.arange(len(months))
        w = 0.35
        fig, ax = plt.subplots(figsize=(5.0, 3.6))

        b1 = ax.bar(x - w/2, google, width=w, color=self.primary_color, label="Google", zorder=3, edgecolor="white", linewidth=0.4)
        b2 = ax.bar(x + w/2, direct, width=w, color=self.accent_color, label="Direct", zorder=3, edgecolor="white", linewidth=0.4)

        ax.set_xticks(x)
        ax.set_xticklabels(months, rotation=0)
        ax.set_ylabel("Sessions", color=DARK)
        ax.set_title("Google vs Direct Traffic", fontsize=10, color=DARK, pad=6)
        ax.legend(framealpha=0.9)
        ax.yaxis.set_major_formatter(mticker.FuncFormatter(lambda v, _: f"{int(v):,}"))

        for bar, val in zip(list(b1) + list(b2), google + direct):
            ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 10,
                    str(val), ha="center", va="bottom", fontsize=6, color=DARK, fontweight="bold")

        fig.tight_layout(pad=0.4)
        path = self.output_dir / "chart_google_direct.png"
        self._savefig(fig, path)
        return path

    def _chart_channels_others(self, data: Dict) -> Path:
        """Generate other channels chart."""
        channels = data.get("channels", [])
        if not channels:
            path = self.output_dir / "chart_channels_others.png"
            if not path.exists():
                fig, ax = plt.subplots(figsize=(5.0, 3.6))
                ax.text(0.5, 0.5, "No channel data available", ha="center", va="center", fontsize=10)
                ax.set_axis_off()
                self._savefig(fig, path)
            return path

        months = [c["month"] for c in channels]
        keys = ["ChatGPT", "Bing", "LinkedIn", "Perplexity", "Email", "Claude"]
        colors = ["#ED7D31", "#4472C4", "#0072C6", "#FF6B35", "#A9D18E", "#7B61FF"]

        n = len(months)
        nk = len(keys)
        w = 0.12
        x = np.arange(n)
        fig, ax = plt.subplots(figsize=(5.0, 3.6))

        for i, (key, color) in enumerate(zip(keys, colors)):
            vals = [c.get(key, 0) for c in channels]
            offset = (i - nk/2 + 0.5) * w
            ax.bar(x + offset, vals, width=w, color=color, label=key, zorder=3, edgecolor="white", linewidth=0.3)

        ax.set_xticks(x)
        ax.set_xticklabels(months, rotation=0)
        ax.set_ylabel("Sessions", color=DARK)
        ax.set_title("Traffic from Various Platforms", fontsize=10, color=DARK, pad=6)
        ax.legend(framealpha=0.9, loc="upper right", ncol=2)

        fig.tight_layout(pad=0.4)
        path = self.output_dir / "chart_channels_others.png"
        self._savefig(fig, path)
        return path
