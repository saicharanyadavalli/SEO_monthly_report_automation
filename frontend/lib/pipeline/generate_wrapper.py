import sys
import json
import logging
from pathlib import Path

# Add SEO_Report_System to path
PIPELINE_DIR = Path(__file__).parent.parent.parent.parent / "backend"
sys.path.insert(0, str(PIPELINE_DIR))

# Suppress standard logging to stdout to keep JSON stream clean
logging.getLogger().setLevel(logging.CRITICAL)

def progress_callback(prog):
    # Emit progress as JSON to stdout
    print(json.dumps({
        "type": "progress",
        "step": prog.step.name if hasattr(prog.step, 'name') else str(prog.step),
        "step_name": prog.step_name,
        "current": prog.current,
        "total": prog.total,
        "message": prog.message,
        "is_complete": prog.is_complete,
        "error": prog.error
    }), flush=True)

def run_mock(company_key: str, skip_llm: bool):
    import time
    stages = [
        ("COLLECT_GSC", "Collecting Google Search Console data...", 1),
        ("COLLECT_GA4", "Collecting GA4 channel data...", 2),
        ("BUILD_DATA", "Building SEO dataset...", 3),
        ("GENERATE_CHARTS", "Generating charts...", 4),
        ("GENERATE_INSIGHTS", "Generating AI insights...", 5),
        ("BUILD_PPTX", "Building PowerPoint report...", 6)
    ]
    
    for i, (step_id, name, current) in enumerate(stages):
        if skip_llm and step_id == "GENERATE_INSIGHTS":
            continue
            
        print(json.dumps({
            "type": "progress",
            "step": step_id,
            "step_name": name,
            "current": current,
            "total": len(stages),
            "message": "Mock processing...",
            "is_complete": False
        }), flush=True)
        time.sleep(1.5)
        
    mock_path = PIPELINE_DIR / "reports" / "mock_report.pptx"
    mock_path.parent.mkdir(parents=True, exist_ok=True)
    if not mock_path.exists():
        mock_path.write_bytes(b"mock pptx content")
        
    print(json.dumps({
        "type": "result",
        "success": True,
        "company_key": company_key,
        "company_name": company_key,
        "output_path": str(mock_path),
        "error_message": None
    }), flush=True)


def run_pipeline(company_key: str, skip_llm: bool, slide_list: list = None):
    try:
        from report_generator.pipeline import ReportPipeline
        
        pipeline = ReportPipeline(
            company_key=company_key,
            progress_callback=progress_callback,
            skip_llm=skip_llm,
            slide_list=slide_list
        )
        
        result = pipeline.run()
        
        size_mb = 0.0
        if result.success and result.output_path:
            import os
            try:
                size_mb = os.path.getsize(result.output_path) / (1024 * 1024)
            except:
                pass

        print(json.dumps({
            "type": "result",
            "success": result.success,
            "company_key": result.company_key,
            "company_name": result.company_name,
            "output_path": str(result.output_path) if result.output_path else None,
            "file_size_mb": round(size_mb, 2),
            "error_message": result.error_message,
            "traceback": result.traceback
        }), flush=True)
        
    except Exception as e:
        import traceback
        print(json.dumps({
            "type": "result",
            "success": False,
            "company_key": company_key,
            "error_message": str(e),
            "traceback": traceback.format_exc()
        }), flush=True)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Missing company_key argument"}))
        sys.exit(1)
        
    company_key = sys.argv[1]
    skip_llm = "--skip-llm" in sys.argv
    use_mock = "--mock" in sys.argv
    
    slide_list = None
    if "--slide-list" in sys.argv:
        idx = sys.argv.index("--slide-list")
        if idx + 1 < len(sys.argv):
            slide_list = sys.argv[idx + 1].split(",")
    
    if use_mock:
        run_mock(company_key, skip_llm)
    else:
        run_pipeline(company_key, skip_llm, slide_list)
