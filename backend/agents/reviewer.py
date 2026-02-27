from langchain_core.messages import HumanMessage, SystemMessage

from agents.llm import llm
from prompts import REVIEWER_PROMPT
from schemas import ReviewerOutput
from state import AgentState


def reviewer_agent(state: AgentState) -> AgentState:
  print(
    f"[Reviewer] Starting — execution_success={state['execution_success']}, revision_count={state['revision_count']}"
  )

  result = llm.with_structured_output(ReviewerOutput).invoke(
    [
      SystemMessage(content=REVIEWER_PROMPT),
      HumanMessage(
        content=f"""Methodology:
{state["parsed_sections"].get("methodology", "")}

Generated code:
{state["generated_code"]}

Execution success: {state["execution_success"]}
Execution output: {state["execution_output"]}
Observed metrics: {state.get("observed_metrics", {})}"""
      ),
    ]
  )

  feedback = result.model_dump()
  print(f"[Reviewer] Done — verdict: {feedback['verdict']}")
  return {
    **state,
    "review_feedback": feedback,
    "review_iteration": state.get("review_iteration", 0) + 1,
    "status": "review complete",
  }
