from typing import TypedDict


class AgentState(TypedDict):
  pdf_path: str
  user_instructions: str  # user specific requests
  parsed_sections: dict
  implementation_plan: str
  generated_code: str
  review_feedback: str
  revision_count: int
  status: str

  execution_output: str
  execution_error: str
  execution_success: bool