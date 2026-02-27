import ast
import json
import re
import subprocess
import sys
import textwrap
import uuid
from pathlib import Path

from state import AgentState

OUTPUT_DIR = Path("/tmp/outputs")
OUTPUT_DIR.mkdir(exist_ok=True)

# Standard library module names (Python 3.10+) — no need to pip install these
_STDLIB_MODULES: set[str] = set(sys.stdlib_module_names)


def _extract_imports(code: str) -> set[str]:
  """Return top-level package names imported by *code*."""
  top_level: set[str] = set()
  try:
    tree = ast.parse(code)
  except SyntaxError:
    return top_level
  for node in ast.walk(tree):
    if isinstance(node, ast.Import):
      for alias in node.names:
        top_level.add(alias.name.split(".")[0])
    elif isinstance(node, ast.ImportFrom):
      if node.module:
        top_level.add(node.module.split(".")[0])
  return top_level


# Common PyPI name overrides (import name -> pip name)
_PIP_NAME: dict[str, str] = {
  "cv2": "opencv-python",
  "sklearn": "scikit-learn",
  "PIL": "pillow",
  "yaml": "pyyaml",
  "bs4": "beautifulsoup4",
  "attr": "attrs",
  "gi": "PyGObject",
  "wx": "wxPython",
}


def _install_packages(python: Path, packages: set[str]) -> str | None:
  """Pip-install *packages* into the sandbox venv. Returns error string on failure."""
  if not packages:
    return None
  pkg_list = [_PIP_NAME.get(p, p) for p in sorted(packages)]
  print(f"[Executor] Installing missing packages: {pkg_list}")
  result = subprocess.run(
    [str(python), "-m", "pip", "install", *pkg_list],
    capture_output=True,
    text=True,
    timeout=120,
  )
  if result.returncode != 0:
    return result.stderr
  return None


def _missing_packages(python: Path, imports: set[str]) -> set[str]:
  """Check which imports are missing inside the sandbox venv."""
  third_party = {name for name in imports if name not in _STDLIB_MODULES}
  if not third_party:
    return set()
  check_script = "; ".join(
    f'exec(\'try:\\n __import__("{name}")\\nexcept ImportError:\\n print("{name}")\')'
    for name in sorted(third_party)
  )
  result = subprocess.run(
    [str(python), "-c", check_script],
    capture_output=True,
    text=True,
    timeout=15,
  )
  return set(result.stdout.strip().splitlines()) if result.stdout.strip() else set()


def _run_with_timeout(cmd: list[str], cwd: Path, timeout: int) -> tuple[bool, str, str]:
  try:
    result = subprocess.run(
      cmd,
      cwd=str(cwd),
      capture_output=True,
      text=True,
      timeout=timeout,
    )
    return result.returncode == 0, result.stdout, result.stderr
  except subprocess.TimeoutExpired:
    return False, "", f"Command timed out after {timeout}s: {' '.join(cmd)}"


def _extract_metrics(stdout: str) -> dict:
  lines = [ln.strip() for ln in stdout.splitlines() if ln.strip()]
  for line in reversed(lines):
    try:
      value = json.loads(line)
    except json.JSONDecodeError:
      continue
    if isinstance(value, dict):
      return value
  return {}


def _extract_required_config_keys(code: str) -> set[str]:
  matches = re.findall(r"""config\[['"]([A-Za-z0-9_]+)['"]\]""", code)
  return set(matches)


def _default_config_value(key: str, ablation: bool = False):
  defaults = {
    "seed": 7 if ablation else 42,
    "random_seed": 7 if ablation else 42,
    "n_agents": 4 if ablation else 5,
    "dim": 2,
    "dimension": 2,
    "n_samples": 160 if ablation else 240,
    "n_features": 8 if ablation else 16,
    "test_size": 0.25 if ablation else 0.2,
    "max_iter": 100 if ablation else 200,
    "max_iterations": 100 if ablation else 200,
    "iterations": 100 if ablation else 200,
    "step_size": 0.1 if ablation else 0.05,
    "step_alpha": 0.08 if ablation else 0.05,
    "step_beta": 0.08 if ablation else 0.05,
    "connectivity_period": 5,
    "penalty_param": 1.0,
    "algorithm": "DLPDS",
  }
  if key in defaults:
    return defaults[key]
  return 1


def _render_yaml_config(keys: set[str], ablation: bool = False) -> str:
  base_keys = {
    "seed",
    "random_seed",
    "n_agents",
    "dim",
    "n_samples",
    "n_features",
    "test_size",
    "max_iter",
    "max_iterations",
    "step_size",
    "step_alpha",
    "step_beta",
    "connectivity_period",
    "penalty_param",
    "algorithm",
  }
  ordered_keys = sorted(base_keys.union(keys))

  lines: list[str] = []
  for key in ordered_keys:
    value = _default_config_value(key, ablation=ablation)
    if isinstance(value, str):
      lines.append(f'{key}: "{value}"')
    elif isinstance(value, bool):
      lines.append(f"{key}: {'true' if value else 'false'}")
    else:
      lines.append(f"{key}: {value}")
  return "\n".join(lines) + "\n"


def _requirements_text(imports: set[str]) -> str:
  third_party = sorted(_PIP_NAME.get(name, name) for name in imports if name not in _STDLIB_MODULES)
  lines = ["pyyaml"]
  for pkg in third_party:
    if pkg not in lines:
      lines.append(pkg)
  return "\n".join(lines) + "\n"


def _generated_repo_readme(state: AgentState) -> str:
  methodology = (state["parsed_sections"].get("methodology") or "").strip()
  abstract = (state["parsed_sections"].get("abstract") or "").strip()
  instructions = (state.get("user_instructions") or "None provided").strip()

  methodology_preview = methodology[:1800] if methodology else "Methodology not extracted."
  abstract_preview = abstract[:800] if abstract else "Abstract not extracted."

  return textwrap.dedent(
    f"""\
    # Paper Reproduction Repo

    This repository was automatically generated by Descartes from an uploaded research paper.

    ## Objective
    Recreate the core methodology and provide a runnable baseline experiment with tests and outputs.

    ## User Instructions
    {instructions}

    ## Paper Abstract (Snapshot)
    {abstract_preview}

    ## Methodology (Snapshot)
    {methodology_preview}

    ## Repository Structure
    - `method.py`: Primary implementation generated from the paper method.
    - `run_experiment.py`: CLI entrypoint to run experiment and write metrics.
    - `configs/default.yaml`: Primary runtime config.
    - `configs/ablation.yaml`: Secondary config for quick variation.
    - `src/`: Supporting modules for problem/algorithm/metrics/utilities.
    - `tests/`: Smoke and contract tests.
    - `results/`: Output metrics and artifacts.
    - `report.md`: Reproduction status and observed outcomes.

    ## Setup
    ```bash
    python -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
    ```

    ## Run
    ```bash
    python run_experiment.py --config configs/default.yaml --output results/metrics.json
    ```

    ## Test
    ```bash
    python -m unittest discover -s tests -p "test_*.py"
    ```
    """
  )


def _build_repo_files(code: str, state: AgentState, imports: set[str]) -> dict[str, str]:
  required_config_keys = _extract_required_config_keys(code)
  run_experiment = textwrap.dedent(
    """\
    import argparse
    import json
    from pathlib import Path

    from method import run_experiment


    def main() -> int:
      parser = argparse.ArgumentParser(description="Run generated paper reproduction experiment")
      parser.add_argument("--config", default="configs/default.yaml", help="Path to YAML config file")
      parser.add_argument("--output", default="results/metrics.json", help="Path to write metrics JSON")
      args = parser.parse_args()

      metrics = run_experiment(args.config)
      out_path = Path(args.output)
      out_path.parent.mkdir(parents=True, exist_ok=True)
      out_path.write_text(json.dumps(metrics, indent=2))
      print(json.dumps(metrics))
      return 0


    if __name__ == "__main__":
      raise SystemExit(main())
    """
  )

  default_config_yaml = _render_yaml_config(required_config_keys, ablation=False)
  ablation_config_yaml = _render_yaml_config(required_config_keys, ablation=True)

  smoke_test = textwrap.dedent(
    """\
    import json
    import subprocess
    import sys
    import unittest


    class SmokeTest(unittest.TestCase):
      def test_run_experiment_outputs_json_metrics(self):
        result = subprocess.run(
          [
            sys.executable,
            "run_experiment.py",
            "--config",
            "configs/default.yaml",
            "--output",
            "results/metrics.json",
          ],
          capture_output=True,
          text=True,
          timeout=40,
        )
        self.assertEqual(result.returncode, 0, msg=result.stderr)
        lines = [ln.strip() for ln in result.stdout.splitlines() if ln.strip()]
        self.assertTrue(lines, "No stdout from run_experiment.py")
        metrics = json.loads(lines[-1])
        self.assertIsInstance(metrics, dict)
        self.assertGreater(len(metrics), 0)


    if __name__ == "__main__":
      unittest.main()
    """
  )

  contract_test = textwrap.dedent(
    """\
    import unittest

    from method import run_experiment


    class ContractTest(unittest.TestCase):
      def test_run_experiment_contract(self):
        metrics = run_experiment("configs/default.yaml")
        self.assertIsInstance(metrics, dict)
        self.assertGreater(len(metrics), 0)
        for key, value in metrics.items():
          self.assertIsInstance(key, str)
          self.assertTrue(
            isinstance(value, (int, float, str, bool, list, dict, type(None))),
            f"Metric '{key}' has unsupported type {type(value).__name__}",
          )


    if __name__ == "__main__":
      unittest.main()
    """
  )

  scripts_run = textwrap.dedent(
    """\
    #!/usr/bin/env bash
    set -euo pipefail

    python run_experiment.py --config configs/default.yaml --output results/metrics.json
    """
  )

  scripts_eval = textwrap.dedent(
    """\
    #!/usr/bin/env bash
    set -euo pipefail

    python run_experiment.py --config configs/ablation.yaml --output results/metrics_ablation.json
    """
  )

  src_problem = textwrap.dedent(
    '''\
"""Problem utilities for the generated reproduction project."""
'''
  )

  src_algorithm = textwrap.dedent(
    '''\
"""Algorithm helpers for the generated reproduction project."""
'''
  )

  src_metrics = textwrap.dedent(
    '''\
"""Metric utilities for the generated reproduction project."""
'''
  )

  src_utils = textwrap.dedent(
    '''\
"""Generic utility functions for the generated reproduction project."""


    def seed_everything(seed: int) -> int:
      return int(seed)
'''
  )

  github_ci = textwrap.dedent(
    """\
    name: Repro Check

    on:
      push:
      pull_request:

    jobs:
      test:
        runs-on: ubuntu-latest
        steps:
          - uses: actions/checkout@v4
          - uses: actions/setup-python@v5
            with:
              python-version: "3.12"
          - run: python -m pip install --upgrade pip
          - run: pip install -r requirements.txt
          - run: python -m unittest discover -s tests -p "test_*.py"
          - run: python run_experiment.py --config configs/default.yaml --output results/metrics.json
    """
  )

  return {
    "method.py": code,
    "run_experiment.py": run_experiment,
    "README.md": _generated_repo_readme(state),
    "requirements.txt": _requirements_text(imports),
    ".gitignore": "__pycache__/\n*.pyc\n.venv/\nresults/*.png\n",
    "configs/default.yaml": default_config_yaml,
    "configs/ablation.yaml": ablation_config_yaml,
    "src/__init__.py": "",
    "src/problem.py": src_problem,
    "src/algorithm.py": src_algorithm,
    "src/metrics.py": src_metrics,
    "src/utils.py": src_utils,
    "scripts/run.sh": scripts_run,
    "scripts/eval.sh": scripts_eval,
    "tests/test_smoke.py": smoke_test,
    "tests/test_contract.py": contract_test,
    "results/.gitkeep": "",
    ".github/workflows/repro.yml": github_ci,
  }


def _write_repo(repo_dir: Path, files: dict[str, str]) -> None:
  for rel_path, contents in files.items():
    path = repo_dir / rel_path
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(contents)


def _write_report(
  repo_dir: Path, state: AgentState, metrics: dict, test_passed: bool, run_passed: bool
) -> str:
  methodology = state["parsed_sections"].get("methodology") or "N/A"
  review = state.get("review_feedback", {})
  report = textwrap.dedent(
    f"""\
    # Reproduction Report

    ## Summary
    - Test suite pass: {test_passed}
    - Experiment run pass: {run_passed}
    - Revision count: {state["revision_count"]}

    ## Observed Metrics
    ```json
    {json.dumps(metrics, indent=2)}
    ```

    ## Reviewer Feedback Snapshot
    ```json
    {json.dumps(review, indent=2)}
    ```

    ## Methodology Snapshot
    {methodology[:1800]}
    """
  )
  (repo_dir / "report.md").write_text(report)
  return report


def _extract_key_metrics(metrics: dict) -> dict:
  key_metrics: dict = {}
  for key, value in metrics.items():
    if isinstance(value, (int, float, str, bool)):
      key_metrics[key] = value
      continue
    if isinstance(value, dict):
      for subkey, subval in value.items():
        if isinstance(subval, (int, float, str, bool)):
          key_metrics[f"{key}.{subkey}"] = subval
  return key_metrics


def _collect_plot_paths(repo_dir: Path) -> list[str]:
  plots_dir = repo_dir / "results" / "plots"
  plots_dir.mkdir(parents=True, exist_ok=True)

  plot_paths: list[str] = []
  for ext in ("*.png", "*.jpg", "*.jpeg", "*.svg"):
    for src in repo_dir.glob(ext):
      dest = plots_dir / src.name
      src.replace(dest)
      plot_paths.append(str(dest))
  return sorted(plot_paths)


def _write_run_artifacts(
  repo_dir: Path,
  success: bool,
  metrics: dict,
  tests_ok: bool,
  run_ok: bool,
  combined_stdout: str,
  combined_stderr: str,
) -> dict:
  results_dir = repo_dir / "results"
  results_dir.mkdir(parents=True, exist_ok=True)

  log_path = results_dir / "run.log"
  log_path.write_text(
    f"=== STDOUT ===\n{combined_stdout}\n\n=== STDERR ===\n{combined_stderr}\n"
  )

  key_metrics = _extract_key_metrics(metrics)
  summary_lines = [
    "# Run Summary",
    "",
    f"- Success: {success}",
    f"- Tests Passed: {tests_ok}",
    f"- Experiment Passed: {run_ok}",
    f"- Metrics Count: {len(metrics)}",
    "",
    "## Key Metrics",
  ]
  if key_metrics:
    summary_lines.extend(f"- {k}: {v}" for k, v in key_metrics.items())
  else:
    summary_lines.append("- No scalar key metrics extracted.")

  summary_path = results_dir / "summary.md"
  summary_path.write_text("\n".join(summary_lines) + "\n")

  plot_paths = _collect_plot_paths(repo_dir)

  return {
    "success": success,
    "tests_passed": tests_ok,
    "experiment_passed": run_ok,
    "metrics_path": str(results_dir / "metrics.json"),
    "summary_path": str(summary_path),
    "log_path": str(log_path),
    "key_metrics": key_metrics,
    "plot_paths": plot_paths,
  }


def executor_agent(state: AgentState) -> AgentState:
  code = state["generated_code"]
  print(f"[Executor] Starting — {len(code)} chars of code, revision_count={state['revision_count']}")

  python = Path(sys.executable)

  imports = _extract_imports(code)
  missing = _missing_packages(python, imports)
  if missing:
    install_err = _install_packages(python, missing)
    if install_err:
      print(f"[Executor] Package install failed:\n{install_err}")
      return {
        **state,
        "execution_output": "",
        "execution_error": f"Failed to install packages {missing}:\n{install_err}",
        "execution_success": False,
        "status": "execution failed",
      }

  repo_dir = OUTPUT_DIR / f"run_{uuid.uuid4().hex[:10]}_r{state['revision_count']}"
  files = _build_repo_files(code, state, imports)
  _write_repo(repo_dir, files)
  print(f"[Executor] Repo materialized at {repo_dir}")

  tests_ok, tests_stdout, tests_stderr = _run_with_timeout(
    [str(python), "-m", "unittest", "discover", "-s", "tests", "-p", "test_*.py"],
    cwd=repo_dir,
    timeout=60,
  )
  run_ok, run_stdout, run_stderr = _run_with_timeout(
    [
      str(python),
      "run_experiment.py",
      "--config",
      "configs/default.yaml",
      "--output",
      "results/metrics.json",
    ],
    cwd=repo_dir,
    timeout=60,
  )

  metrics = _extract_metrics(run_stdout)
  report = _write_report(repo_dir, state, metrics, tests_ok, run_ok)
  success = tests_ok and run_ok

  print(f"[Executor] Done — tests_ok={tests_ok}, run_ok={run_ok}, success={success}")

  combined_stdout = (
    f"$ python -m unittest discover -s tests -p test_*.py\n{tests_stdout}\n"
    f"$ python run_experiment.py --config configs/default.yaml --output results/metrics.json\n{run_stdout}\n"
  )
  combined_stderr = (
    f"$ python -m unittest discover -s tests -p test_*.py\n{tests_stderr}\n"
    f"$ python run_experiment.py --config configs/default.yaml --output results/metrics.json\n{run_stderr}\n"
  )
  run_result = _write_run_artifacts(
    repo_dir=repo_dir,
    success=success,
    metrics=metrics,
    tests_ok=tests_ok,
    run_ok=run_ok,
    combined_stdout=combined_stdout,
    combined_stderr=combined_stderr,
  )

  return {
    **state,
    "execution_output": combined_stdout,
    "execution_error": combined_stderr if not success else "",
    "execution_success": success,
    "status": "executed successfully" if success else "execution failed",
    "output_repo_path": str(repo_dir),
    "observed_metrics": metrics,
    "report_markdown": report,
    "run_result": run_result,
  }
