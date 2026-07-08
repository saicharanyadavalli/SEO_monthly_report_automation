"""Analyzer for Core Web Vitals (CWV) metrics."""
from __future__ import annotations

from typing import Any, Dict

THRESHOLDS = {
    "fcp": {"good": 1.8, "poor": 3.0, "unit": "s", "name": "First Contentful Paint", "abbr": "FCP"},
    "lcp": {"good": 2.5, "poor": 4.0, "unit": "s", "name": "Largest Contentful Paint", "abbr": "LCP"},
    "tbt": {"good": 200.0, "poor": 600.0, "unit": "ms", "name": "Total Blocking Time", "abbr": "TBT"},
    "cls": {"good": 0.10, "poor": 0.25, "unit": "", "name": "Cumulative Layout Shift", "abbr": "CLS"},
    "si": {"good": 3.4, "poor": 5.8, "unit": "s", "name": "Speed Index", "abbr": "SI"},
}

IMPACT_CLAUSES = {
    "fcp": {
        "good": "indicating that initial page elements render quickly for visitors",
        "needs_improvement": "meaning users wait longer for the first visual content to render",
        "poor": "meaning users wait nearly twice as long for initial content to render, which can increase bounce rates",
    },
    "lcp": {
        "good": "indicating that the main page content loads efficiently",
        "needs_improvement": "prolonging the loading experience for the main page content",
        "poor": "making this the most critical optimization area to improve user experience",
    },
    "tbt": {
        "good": "indicating minimal JavaScript-related blocking",
        "needs_improvement": "showing moderate input delay that could affect responsiveness",
        "poor": "indicating heavy JavaScript execution delays that degrade page responsiveness",
    },
    "cls": {
        "good": "indicating a stable visual layout",
        "needs_improvement": "placing the site in the needs improvement category due to visible layout shifts",
        "poor": "causing severe layout instability that disrupts the user experience",
    },
    "si": {
        "good": "indicating fast visual loading of page content",
        "needs_improvement": "showing moderate delay in visual page construction",
        "poor": "indicating slow visual rendering of page content",
    },
}


def analyze_cwv(raw_data: Dict[str, Dict[str, Any]] | None) -> Dict[str, Any] | None:
    """Analyze raw Core Web Vitals metrics and add status, delta, and generated bullet text."""
    if not raw_data:
        return None

    analyzed = {}
    for key, val_dict in raw_data.items():
        if key not in THRESHOLDS:
            continue

        value = val_dict.get("value")
        if value is None:
            analyzed[key] = {
                "value": None,
                "unit": THRESHOLDS[key]["unit"],
                "status": "unknown",
                "delta": None,
                "text": f"{THRESHOLDS[key]['name']} ({THRESHOLDS[key]['abbr']}): Data unavailable.",
            }
            continue

        meta = THRESHOLDS[key]
        good = meta["good"]
        poor = meta["poor"]
        unit = meta["unit"]

        # Calculate status
        if value <= good:
            status = "good"
            direction = "better"
            delta = good - value
        elif value <= poor:
            status = "needs_improvement"
            direction = "worse" if key == "cls" else "slower"
            delta = value - good
        else:
            status = "poor"
            direction = "worse" if key == "cls" else "slower"
            delta = value - good

        # Round values for display
        if unit == "ms":
            val_str = f"{int(round(value))}"
            delta_str = f"{int(round(delta))}"
            good_str = f"{int(round(good))}"
            poor_str = f"{int(round(poor))}"
        else:
            val_str = f"{value:.2f}"
            delta_str = f"{delta:.2f}"
            good_str = f"{good:.2f}"
            poor_str = f"{poor:.2f}"

        # Double poor check
        double_poor_suffix = ""
        if status == "poor" and value > 2 * poor:
            double_poor_suffix = " and more than double the poor-performance threshold"

        impact = IMPACT_CLAUSES[key][status]

        # Construct copy
        # Name (ABBR): value. Benchmark is good, above poor is poor. At value, it is delta slower/better than ideal/recommended threshold [double poor], impact.
        benchmark_clause = f"Google's recommended benchmark is {good_str}{unit}, with anything above {poor_str}{unit} considered poor"
        
        if key == "cls":
            comp_clause = f"At {val_str}, the site is {delta_str} {direction} than the recommended {good_str}"
        else:
            comp_clause = f"At {val_str}{unit}, the site is {delta_str}{unit} {direction} than the recommended {good_str}{unit}"

        text = f"{meta['name']} ({meta['abbr']}): {val_str}{unit}. {benchmark_clause}. {comp_clause}{double_poor_suffix}, {impact}."

        analyzed[key] = {
            "value": value,
            "unit": unit,
            "status": status,
            "delta": delta,
            "text": text,
        }

    return analyzed
