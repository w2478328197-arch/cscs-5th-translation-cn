import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path


def load_config(config_path: Path) -> dict:
    with config_path.open("r", encoding="utf-8") as f:
        return json.load(f)


def resolve(project_root: Path, rel_path: str) -> Path:
    return (project_root / rel_path).resolve()


def read_manifest(manifest_path: Path) -> list:
    with manifest_path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, list):
        raise ValueError(f"Manifest must be a list: {manifest_path}")
    return data


def assemble_markdown(translated_dir: Path, manifest_path: Path, output_path: Path) -> tuple[int, int, list]:
    files = read_manifest(manifest_path)
    merged = []
    missing = 0
    used = 0
    missing_files = []

    for rel_name in files:
        f = translated_dir / rel_name
        if not f.exists():
            missing += 1
            missing_files.append(rel_name)
            continue
        merged.append(f.read_text(encoding="utf-8").rstrip())
        merged.append("\n\n---\n\n")
        used += 1

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text("".join(merged), encoding="utf-8")
    return used, missing, missing_files


def analyze_manifest_sequence(files: list) -> list:
    """
    Best-effort sequence check for names like Chapter_05_*.md.
    Generates warnings instead of hard failures.
    """
    warnings = []
    chapter_nums = []
    for f in files:
        m = re.search(r"Chapter_(\d{1,3})", f)
        if m:
            chapter_nums.append(int(m.group(1)))
    if len(chapter_nums) < 2:
        return warnings

    unique_sorted = sorted(set(chapter_nums))
    for i in range(len(unique_sorted) - 1):
        cur_n = unique_sorted[i]
        next_n = unique_sorted[i + 1]
        if next_n - cur_n > 1:
            warnings.append(f"Possible chapter gap in manifest: {cur_n} -> {next_n}")
    return warnings


def audit_markdown(
    md_path: Path,
    images_dir: Path,
    required_headings: list,
    max_missing_images_to_pass: int,
    manifest_files: list | None = None,
    translated_dir: Path | None = None,
) -> tuple[bool, dict]:
    content = md_path.read_text(encoding="utf-8")
    errors = []
    warnings = []

    # 1) Heading presence
    for heading in required_headings:
        if heading == "#":
            if not re.search(r"^#\s+", content, flags=re.MULTILINE):
                errors.append("No top-level heading found (# ...).")
        elif heading and heading not in content:
            errors.append(f"Required heading fragment missing: {heading}")

    # 2) Math markers balance
    inline_math = re.findall(r"(?<!\$)\$(?!\$)", content)
    if len(inline_math) % 2 != 0:
        errors.append("Unbalanced inline math markers ($).")
    display_math = re.findall(r"\$\$", content)
    if len(display_math) % 2 != 0:
        errors.append("Unbalanced display math markers ($$).")

    # 3) Linked image existence
    image_links = re.findall(r"!\[[^\]]*\]\(([^)]+)\)", content)
    missing_images = []
    for link in image_links:
        # normalize links such as ../images/x or images/x
        clean = link.strip().replace("\\", "/")
        if clean.startswith("http://") or clean.startswith("https://") or clean.startswith("data:"):
            continue
        candidate = (md_path.parent / clean).resolve()
        if not candidate.exists():
            # fallback to images dir + basename
            fallback = images_dir / os.path.basename(clean)
            if not fallback.exists():
                missing_images.append(clean)

    if len(missing_images) > max_missing_images_to_pass:
        errors.append(f"Missing images: {len(missing_images)} (threshold: {max_missing_images_to_pass})")

    manifest_missing = []
    if manifest_files and translated_dir:
        for rel_name in manifest_files:
            if not (translated_dir / rel_name).exists():
                manifest_missing.append(rel_name)
        if manifest_missing:
            errors.append(f"Manifest missing files: {len(manifest_missing)}")
        warnings.extend(analyze_manifest_sequence(manifest_files))

    return len(errors) == 0, {
        "file": str(md_path),
        "image_links": len(image_links),
        "missing_images": missing_images[:20],
        "manifest_missing_files": manifest_missing[:20],
        "error_count": len(errors),
        "warning_count": len(warnings),
        "errors": errors,
        "warnings": warnings,
    }


def run_node_render(project_root: Path, input_md: Path, output_html: Path, output_pdf: Path) -> None:
    env = os.environ.copy()
    env["CSCS_INPUT_MD"] = str(input_md)
    env["CSCS_OUTPUT_HTML"] = str(output_html)
    env["CSCS_OUTPUT_PDF"] = str(output_pdf)

    subprocess.run(["node", "render_master.js"], cwd=project_root, env=env, check=True)
    subprocess.run(["node", "print_pdf.js"], cwd=project_root, env=env, check=True)


def main() -> int:
    parser = argparse.ArgumentParser(description="Unified translation pipeline runner")
    parser.add_argument("--config", default="config/pipeline.json", help="Path to pipeline config JSON")
    parser.add_argument(
        "--action",
        default="all",
        choices=["assemble", "audit", "render", "all", "smoke"],
        help="Pipeline action",
    )
    args = parser.parse_args()

    project_root = Path(__file__).resolve().parent.parent
    config_path = resolve(project_root, args.config)
    cfg = load_config(config_path)
    paths = cfg["paths"]

    translated_dir = resolve(project_root, paths["translated_dir"])
    images_dir = resolve(project_root, paths["images_dir"])
    manifest_path = resolve(project_root, paths["manifest"])
    assembled_md = resolve(project_root, paths["assembled_markdown"])
    output_html = resolve(project_root, paths["html_output"])
    output_pdf = resolve(project_root, paths["pdf_output"])

    audit_cfg = cfg.get("audit", {})
    required_headings = audit_cfg.get("required_headings", ["#"])
    max_missing_images_to_pass = int(audit_cfg.get("max_missing_images_to_pass", 0))

    if args.action == "smoke":
        smoke_cfg = cfg.get("smoke", {})
        smoke_manifest = resolve(project_root, smoke_cfg.get("sample_manifest", "manifest_v2.json"))
        smoke_md = resolve(project_root, smoke_cfg.get("assembled_markdown", "translated/CSCS_SMOKE.md"))
        smoke_pdf = resolve(project_root, smoke_cfg.get("pdf_output", "output/CSCS_SMOKE.pdf"))
        smoke_html = output_html

        smoke_manifest_files = read_manifest(smoke_manifest)
        used, missing, missing_files = assemble_markdown(translated_dir, smoke_manifest, smoke_md)
        print(f"[smoke] assembled files: used={used}, missing={missing}, out={smoke_md}")
        ok, report = audit_markdown(
            smoke_md,
            images_dir,
            required_headings,
            max_missing_images_to_pass,
            manifest_files=smoke_manifest_files,
            translated_dir=translated_dir,
        )
        if missing_files:
            print(json.dumps({"smoke_missing_files": missing_files[:20]}, ensure_ascii=False, indent=2))
        print(json.dumps({"smoke_audit_ok": ok, "report": report}, ensure_ascii=False, indent=2))
        if not ok:
            return 2
        run_node_render(project_root, smoke_md, smoke_html, smoke_pdf)
        print(f"[smoke] rendered pdf: {smoke_pdf}")
        return 0

    if args.action in ("assemble", "all"):
        used, missing, missing_files = assemble_markdown(translated_dir, manifest_path, assembled_md)
        print(f"[assemble] used={used}, missing={missing}, out={assembled_md}")
        if missing_files:
            print(json.dumps({"assemble_missing_files": missing_files[:20]}, ensure_ascii=False, indent=2))

    if args.action in ("audit", "all"):
        manifest_files = read_manifest(manifest_path)
        ok, report = audit_markdown(
            assembled_md,
            images_dir,
            required_headings,
            max_missing_images_to_pass,
            manifest_files=manifest_files,
            translated_dir=translated_dir,
        )
        print(json.dumps({"audit_ok": ok, "report": report}, ensure_ascii=False, indent=2))
        if not ok:
            return 2

    if args.action in ("render", "all"):
        run_node_render(project_root, assembled_md, output_html, output_pdf)
        print(f"[render] pdf={output_pdf}")

    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except subprocess.CalledProcessError as e:
        print(f"Command failed: {e}", file=sys.stderr)
        raise SystemExit(1)
