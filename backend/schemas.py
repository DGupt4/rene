from typing import Literal

from pydantic import BaseModel, Field


class DebuggerOutput(BaseModel):
  analysis: str = Field(description="Root cause analysis of the error")
  action: Literal["patch", "recode"] = Field(
    description="'patch' for a targeted fix to the existing code; 'recode' if the architecture is fundamentally flawed and needs rewriting from scratch"
  )
  output: str = Field(
    description="If action is 'patch': the complete corrected Python code (no markdown fences). If action is 'recode': clear guidance for the coder on what to design differently."
  )


class PlannerOutput(BaseModel):
  overview: str = Field(description="One paragraph summary of what will be implemented")
  files: list[str] = Field(
    description="List of files to create (typically: method.py, run_experiment.py, config.yaml, tests/test_smoke.py, report.md)"
  )
  classes: list[str] = Field(description="List of classes needed with brief descriptions")
  functions: list[str] = Field(description="List of functions needed with brief descriptions")
  libraries: list[str] = Field(description="List of pip-installable libraries required")
  implementation_notes: str = Field(description="Important details or caveats")


class ReviewerOutput(BaseModel):
  verdict: Literal["complete", "partial", "incomplete"]
  summary: str = Field(description="2-3 sentence summary of what was implemented")
  missing: list[str] = Field(description="Features from the paper that were not implemented")
  suggestions: list[str] = Field(description="Brief improvement ideas")
