from typing import Literal

from pydantic import BaseModel, Field


class PlannerOutput(BaseModel):
  overview: str = Field(description="One paragraph summary of what will be implemented")
  files: list[str] = Field(description="List of files to create (keep to one file)")
  classes: list[str] = Field(description="List of classes needed with brief descriptions")
  functions: list[str] = Field(description="List of functions needed with brief descriptions")
  libraries: list[str] = Field(description="List of pip-installable libraries required")
  implementation_notes: str = Field(description="Important details or caveats")


class ReviewerOutput(BaseModel):
  verdict: Literal["complete", "partial", "incomplete"]
  summary: str = Field(description="2-3 sentence summary of what was implemented")
  missing: list[str] = Field(description="Features from the paper that were not implemented")
  suggestions: list[str] = Field(description="Brief improvement ideas")