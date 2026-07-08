"""AI-powered insight generation for SEO reports with token tracking."""
from __future__ import annotations

import json
import logging
import os
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

import httpx

from config.settings import settings

logger = logging.getLogger(__name__)

# Token usage log file
TOKEN_LOG_FILE = Path(__file__).parent.parent / "output" / "llm_token_usage.json"

# System prompt for LLM
SYSTEM_PROMPT = (
    "You are an expert SEO analyst writing data-driven slide copy for a monthly SEO report. "
    "CRITICAL FORMATTING RULES you must follow without exception: "
    "1. Never use em dashes (—) or en dashes (–) anywhere in your output. Use a comma or rewrite the sentence instead. "
    "2. Never use hyphens as bullet markers. Bullets are plain sentences with no leading punctuation. "
    "3. Never use markdown formatting (no **, no *, no #, no backticks). "
    "4. Never write placeholder text. "
    "5. Use only real numbers from the provided data. "
    "6. Be professional and specific. "
    "Return ONLY the requested text with no preamble and no closing remarks."
)

NODASH = (
    "IMPORTANT: Do NOT use em dashes, en dashes, or hyphens in any form. "
    "Do NOT start bullets with a dash or hyphen. "
    "Write each bullet as a plain sentence on its own line. "
    "Do NOT use markdown. "
)


class TokenUsageTracker:
    """Tracks LLM token usage across all API calls."""

    def __init__(self):
        self.calls: List[Dict] = []
        self.total_input_tokens = 0
        self.total_output_tokens = 0

    def add_call(self, label: str, input_tokens: int, output_tokens: int, model: str, latency_ms: float):
        """Record a single API call."""
        call_record = {
            "timestamp": datetime.now().isoformat(),
            "label": label,
            "model": model,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "total_tokens": input_tokens + output_tokens,
            "latency_ms": round(latency_ms, 2),
        }
        self.calls.append(call_record)
        self.total_input_tokens += input_tokens
        self.total_output_tokens += output_tokens
        logger.info(f"LLM call '{label}': {input_tokens} input + {output_tokens} output = {input_tokens + output_tokens} tokens")

    def save_log(self, company_key: str):
        """Save token usage log to JSON file."""
        TOKEN_LOG_FILE.parent.mkdir(parents=True, exist_ok=True)

        log_data = {
            "generated_at": datetime.now().isoformat(),
            "company_key": company_key,
            "model": settings.llm_model,
            "base_url": settings.llm_base_url,
            "summary": {
                "total_calls": len(self.calls),
                "total_input_tokens": self.total_input_tokens,
                "total_output_tokens": self.total_output_tokens,
                "total_tokens": self.total_input_tokens + self.total_output_tokens,
            },
            "calls": self.calls,
        }

        with open(TOKEN_LOG_FILE, "w", encoding="utf-8") as f:
            json.dump(log_data, f, indent=2)

        logger.info(f"Token usage log saved to: {TOKEN_LOG_FILE}")
        return log_data

    def print_summary(self):
        """Print token usage summary."""
        print("\n" + "=" * 60)
        print("LLM TOKEN USAGE SUMMARY")
        print("=" * 60)
        print(f"Total API calls:     {len(self.calls)}")
        print(f"Total input tokens:  {self.total_input_tokens:,}")
        print(f"Total output tokens: {self.total_output_tokens:,}")
        print(f"Total tokens:        {self.total_input_tokens + self.total_output_tokens:,}")
        print("=" * 60)

        print("\nPer-call breakdown:")
        for call in self.calls:
            print(f"  {call['label']:30} | In: {call['input_tokens']:6,} | Out: {call['output_tokens']:5,} | Total: {call['total_tokens']:6,}")
        print("=" * 60 + "\n")


class AIInsightGenerator:
    """Generates AI-powered insights for SEO reports."""

    def __init__(
        self,
        base_url: str | None = None,
        api_key: str | None = None,
        model: str | None = None,
    ) -> None:
        self.base_url = base_url or settings.llm_base_url
        self.api_key = api_key or settings.llm_api_key
        self.model = model or settings.llm_model
        self.token_tracker = TokenUsageTracker()

        if not self.api_key:
            raise ValueError("LLM API key is required. Set ANTHROPIC_AUTH_TOKEN environment variable.")

    def _call_llm(self, prompt: str, label: str, max_retries: int = 3) -> str:
        """Make a call to the LLM API with retry logic and token tracking."""
        logger.info("Generating: %s", label)
        url = self.base_url.rstrip("/") + "/v1/messages"
        headers = {
            "Content-Type": "application/json",
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
        }
        payload = {
            "model": self.model,
            "max_tokens": 1500,
            "system": SYSTEM_PROMPT,
            "messages": [{"role": "user", "content": prompt}],
        }

        start_time = time.time()

        for attempt in range(max_retries):
            try:
                response = httpx.post(url, headers=headers, json=payload, timeout=90)
                response.raise_for_status()
                data = response.json()

                latency_ms = (time.time() - start_time) * 1000

                # Extract token usage from response
                input_tokens = data.get("usage", {}).get("input_tokens", 0)
                output_tokens = data.get("usage", {}).get("output_tokens", 0)

                # If no usage info, estimate from response
                if input_tokens == 0:
                    input_tokens = len(prompt.split()) * 1.3  # rough estimate
                if output_tokens == 0:
                    output_tokens = len(str(data).split()) * 1.3

                # Track token usage
                self.token_tracker.add_call(label, int(input_tokens), int(output_tokens), self.model, latency_ms)

                # Standard Anthropic format
                for block in data.get("content", []):
                    if block.get("type") == "text":
                        return block["text"].strip()

                # OpenAI-compatible proxy fallback
                choices = data.get("choices", [])
                if choices:
                    return choices[0]["message"]["content"].strip()

                return f"[Could not parse response for {label}]"

            except Exception as e:
                logger.warning("Attempt %d failed for %s: %s", attempt + 1, label, e)
                if attempt < max_retries - 1:
                    time.sleep(2 ** attempt)

        logger.error("Failed to generate %s after %d attempts", label, max_retries)
        return f"[ERROR generating {label}]"

    def generate_all_insights(self, data: Dict[str, Any], company_key: str = "unknown") -> Dict[str, str]:
        """Generate all AI insights for the report."""
        logger.info("Starting AI insight generation...")

        # Bypass LLM call if there is no data for specific sections
        gainers = data.get("page_gainers", [])
        if not gainers:
            trending_up = "No pages with positive search traffic growth recorded during this period."
        else:
            trending_up = self._call_llm(
                self._build_prompt_content_trending_up(data), "Trending up"
            )

        decliners = data.get("page_decliners", [])
        if not decliners:
            trending_down = "No pages with significant traffic decline recorded during this period."
        else:
            trending_down = self._call_llm(
                self._build_prompt_content_trending_down(data), "Trending down"
            )

        branded = data.get("keywords", {}).get("branded", [])
        if not branded:
            branded_kw_analysis = "No branded search queries recorded for this period. All organic search traffic was driven by non-branded keywords."
        else:
            branded_kw_analysis = self._call_llm(
                self._build_prompt_branded_kw(data), "Branded keywords"
            )

        non_branded = data.get("keywords", {}).get("non_branded", [])
        if not non_branded:
            nonbranded_kw_analysis = "No non-branded search queries recorded for this period. All organic search traffic was driven by branded keywords."
        else:
            nonbranded_kw_analysis = self._call_llm(
                self._build_prompt_nonbranded_kw(data), "Non-branded keywords"
            )

        channels = data.get("channels", [])
        if not channels:
            channels_summary = "No organic channel performance data is available for this period."
        else:
            channels_summary = self._call_llm(
                self._build_prompt_channels(data), "Channels summary"
            )

        # --- NEW: top pages / top blog pages analysis (ported from v2) ---
        non_blog_pages = data.get("pages", {}).get("non_blog_pages", [])
        if not non_blog_pages:
            top_pages_analysis = "No non-blog page performance data is available for this period."
        else:
            top_pages_analysis = self._call_llm(
                self._build_prompt_top_pages(data), "Top pages analysis"
            )

        blog_pages = data.get("pages", {}).get("blog_pages", [])
        if not blog_pages:
            top_blog_pages_analysis = "No blog page performance data is available for this period."
        else:
            top_blog_pages_analysis = self._call_llm(
                self._build_prompt_top_blog_pages(data), "Top blog pages analysis"
            )
        # --- END NEW ---

        texts = {
            "six_month_summary": self._call_llm(
                self._build_prompt_6month_summary(data), "6-month summary"
            ),
            "monthly_summary": self._call_llm(
                self._build_prompt_monthly_summary(data), "Monthly summary"
            ),
            "content_trending_up": trending_up,
            "content_trending_down": trending_down,
            "branded_kw_analysis": branded_kw_analysis,
            "nonbranded_kw_analysis": nonbranded_kw_analysis,
            "channels_summary": channels_summary,
            "top_pages_analysis": top_pages_analysis,
            "top_blog_pages_analysis": top_blog_pages_analysis,
        }

        # Save token usage log
        self.token_tracker.save_log(company_key)

        # Print summary to console
        self.token_tracker.print_summary()

        logger.info("AI insight generation complete")
        return texts

    # === Prompt Builders ===

    def _build_prompt_6month_summary(self, data: Dict) -> str:
        monthly = data["traffic"]["monthly"]
        bvnb = data["traffic"]["branded_vs_nonbranded"]
        months = list(monthly.keys())

        rows = "\n".join(
            f"  {m}: clicks={monthly[m]['clicks']}, impressions={monthly[m]['impressions']:,}, "
            f"ctr={monthly[m]['ctr']*100:.2f}%, avg_position={monthly[m]['position']:.1f}"
            for m in months
        )
        brows = "\n".join(
            f"  {m}: branded={bvnb[m]['branded']}, non_branded={bvnb[m]['non_branded']}"
            for m in bvnb
        )

        return f"""{NODASH}
Write exactly 5 bullet points summarising SEO performance for the 6-month period {months[0]} to {months[-1]}.

Monthly traffic data:
{rows}

Branded vs non-branded splits:
{brows}

Each bullet point must:
- Start on its own line with NO bullet character (the renderer adds it)
- Be 2 to 3 concise sentences (35-55 words per bullet)
- Cover a distinct topic: branded trends, non-branded content, blog impact, ranking improvements, and opportunities
- Include specific numbers from the data above
- Format: **Bold Title** - Description sentence(s)

Output ONLY the 5 lines, no headers, no blank lines."""

    def _build_prompt_monthly_summary(self, data: Dict) -> str:
        monthly = data["traffic"]["monthly"]
        months = list(monthly.keys())
        lm, pm = months[-1], months[-2]
        bvnb = data["traffic"]["branded_vs_nonbranded"]
        blog = data["pages"]["blog_pages"][0] if data["pages"]["blog_pages"] else {}

        return f"""{NODASH}
Write exactly 5 bullet points summarising SEO performance for {lm}.

{lm} data: clicks={monthly[lm]['clicks']}, impressions={monthly[lm]['impressions']:,}, ctr={monthly[lm]['ctr']*100:.3f}%, avg_position={monthly[lm]['position']:.1f}
{pm} data: clicks={monthly[pm]['clicks']}, impressions={monthly[pm]['impressions']:,}
{lm} branded={bvnb[lm]['branded']}, non_branded={bvnb[lm]['non_branded']}
{pm} branded={bvnb[pm]['branded']}, non_branded={bvnb[pm]['non_branded']}
Top blog page: {blog.get('url', 'N/A')} with {blog.get('clicks', 0)} clicks, CTR {blog.get('ctr', 0)*100:.2f}%, position {blog.get('position', 0):.1f}

Each bullet point must:
- Start on its own line with NO bullet character (the renderer adds it)
- Be 2 to 3 concise sentences (35-55 words per bullet)
- Cover a distinct topic: overall traffic MoM, branded queries, blog content, commercial pages, non-branded recovery
- Include specific numbers from the data above

Output ONLY the 5 lines, no headers, no blank lines."""

    def _build_prompt_content_trending_up(self, data: Dict) -> str:
        gainers = data.get("page_gainers", [])
        num_bullets = min(3, len(gainers))
        rows = "\n".join(
            f"  {g['page']}: current clicks={g['current_clicks']}, change=+{g['click_delta']}"
            for g in gainers[:5]
        )
        return f"""{NODASH}
Write exactly {num_bullets} bullet points about pages with the biggest INCREASE in clicks this month.

Page data:
{rows}

Rules:
Write each bullet as 2-3 full sentences on a single line with no leading dash, hyphen, or number.
Start the first bullet with the page that gained the most clicks.
Include the exact click numbers and the change amount in each bullet.
Provide potential reasons for the traffic increase (e.g., seasonality, algorithm updates, or content relevance).
Suggest actionable strategies to capitalize on this upward trend.
Each bullet must be 30 to 60 words.
Output only the {num_bullets} bullet lines, nothing else."""

    def _build_prompt_content_trending_down(self, data: Dict) -> str:
        decliners = data.get("page_decliners", [])
        num_bullets = min(3, len(decliners))
        rows = "\n".join(
            f"  {g['page']}: current clicks={g['current_clicks']}, change={g['click_delta']}"
            for g in decliners[:5]
        )
        return f"""{NODASH}
Write exactly {num_bullets} bullet points about pages with the biggest DECREASE in clicks this month.

Page data:
{rows}

Rules:
Write each bullet as 2-3 full sentences on a single line with no leading dash, hyphen, or number.
Start the first bullet with the page that lost the most clicks.
Include the exact click numbers and the decline amount in each bullet.
Explain potential reasons for the drop (e.g., lost rankings, keyword decay, seasonality, or technical issues).
Suggest one concrete action or optimization strategy to recover traffic for each declining page.
Each bullet must be 30 to 60 words.
Output only the {num_bullets} bullet lines, nothing else."""

    def _build_prompt_branded_kw(self, data: Dict) -> str:
        branded = data.get("keywords", {}).get("branded", [])
        num_bullets = min(5, len(branded))
        rows = "\n".join(
            f"  {k['query']}: clicks={k['clicks']}, impressions={k['impressions']}, "
            f"ctr={k['ctr']*100:.1f}%, position={k['position']:.1f}"
            for k in branded[:10]
        )
        aspects = "top query, highest CTR, location variants, long-tail support, low-CTR opportunity"
        if num_bullets < 5:
            aspects = ", ".join(["top query", "highest CTR", "long-tail support", "performance summary"][:num_bullets])

        return f"""{NODASH}
Write exactly {num_bullets} bullet points analyzing top branded keyword performance.

Keyword data:
{rows}

Rules:
Write each bullet as 2 to 3 full sentences on a single line with no leading dash, hyphen, or number.
Each bullet must cover a different aspect from: {aspects}.
Use exact query names and numbers from the data in every bullet.
Each bullet must be 35 to 55 words.
Output only the {num_bullets} bullet lines, nothing else."""

    def _build_prompt_nonbranded_kw(self, data: Dict) -> str:
        non_branded = data.get("keywords", {}).get("non_branded", [])
        num_bullets = min(5, len(non_branded))
        rows = "\n".join(
            f"  {k['query']}: clicks={k['clicks']}, impressions={k['impressions']}, "
            f"ctr={k['ctr']*100:.1f}%, position={k['position']:.1f}"
            for k in non_branded[:10]
        )
        aspects = "top performer, CTR opportunity, content cluster dominance, niche wins, ranking gap"
        if num_bullets < 5:
            aspects = ", ".join(["top performer", "CTR opportunity", "niche wins", "performance summary"][:num_bullets])

        return f"""{NODASH}
Write exactly {num_bullets} bullet points analyzing top non-branded keyword performance.

Keyword data:
{rows}

Rules:
Write each bullet as 2 to 3 full sentences on a single line with no leading dash, hyphen, or number.
Each bullet must cover a different aspect from: {aspects}.
Use exact query names and numbers from the data in every bullet.
Each bullet must be 35 to 55 words.
Output only the {num_bullets} bullet lines, nothing else."""

    def _build_prompt_channels(self, data: Dict) -> str:
        channels = data.get("channels", [])
        if not channels:
            return "No channel data available."

        last = channels[-1]
        rows = "\n".join(
            f"  {c['month']}: Google={c['Google']}, Direct={c['Direct']}, "
            f"Bing={c.get('Bing',0)}, LinkedIn={c.get('LinkedIn',0)}, "
            f"ChatGPT={c.get('ChatGPT',0)}, Claude={c.get('Claude',0)}, "
            f"Perplexity={c.get('Perplexity',0)}, Email={c.get('Email',0)}"
            for c in channels
        )
        return f"""{NODASH}
Write 1 paragraph of 4 to 5 sentences summarizing organic channel traffic for {last['month']}.

Channel data:
{rows}

Highlight: Google traffic trend, Direct traffic change, AI referral channels (ChatGPT, Claude, Perplexity) growth over time, any notable shifts.
Use specific numbers. Total: 80 to 100 words."""

    # --- NEW prompt builders (ported from v2, adapted to this file's data schema) ---

    def _build_prompt_top_pages(self, data: Dict) -> str:
        pages = data.get("pages", {}).get("non_blog_pages", [])
        num_bullets = min(4, len(pages))
        rows = "\n".join(
            f"  {p.get('url', p.get('page', 'Unknown'))}: clicks={p.get('clicks', 0)}, "
            f"impressions={p.get('impressions', 0):,}, ctr={p.get('ctr', 0)*100:.2f}%, "
            f"position={p.get('position', 0):.1f}"
            for p in pages[:10]
        )
        return f"""{NODASH}
Write exactly {num_bullets} bullet points analyzing the top performing non-blog pages (service, product, or commercial pages).

Page data:
{rows}

Rules:
Write each bullet as 2 to 3 full sentences on a single line with no leading dash, hyphen, or number.
Use exact URLs and numbers from the data in every bullet.
Cover a distinct topic per bullet: best-performing page category, what likely makes it successful, patterns worth replicating on other pages, and a concrete recommendation.
Each bullet must be 30 to 50 words.
Output only the {num_bullets} bullet lines, nothing else."""

    def _build_prompt_top_blog_pages(self, data: Dict) -> str:
        blog_pages = data.get("pages", {}).get("blog_pages", [])
        num_bullets = min(4, len(blog_pages))
        rows = "\n".join(
            f"  {p.get('url', p.get('page', 'Unknown'))}: clicks={p.get('clicks', 0)}, "
            f"impressions={p.get('impressions', 0):,}, ctr={p.get('ctr', 0)*100:.2f}%, "
            f"position={p.get('position', 0):.1f}"
            for p in blog_pages[:10]
        )
        return f"""{NODASH}
Write exactly {num_bullets} bullet points analyzing the top performing blog content.

Blog page data:
{rows}

Rules:
Write each bullet as 2 to 3 full sentences on a single line with no leading dash, hyphen, or number.
Use exact URLs and numbers from the data in every bullet.
Cover a distinct topic per bullet: best-performing blog topic or format, engagement pattern observed, a content-strategy recommendation, and an opportunity to expand the topic cluster.
Each bullet must be 30 to 50 words.
Output only the {num_bullets} bullet lines, nothing else."""