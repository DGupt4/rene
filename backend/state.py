from typing import TypedDict


class AgentState(TypedDict):
  pdf_path: str
  user_instructions: str
  parsed_sections: dict
  implementation_plan: dict
  generated_code: str
  review_feedback: dict
  revision_count: int
  status: str

  execution_output: str
  execution_error: str
  execution_success: bool
  error_history: list
  debug_action: str
  review_iteration: int
  output_repo_path: str
  observed_metrics: dict
  report_markdown: str
  github_repo_name: str
  github_repo_url: str
  github_publish_error: str
  published: bool
  run_result: dict
