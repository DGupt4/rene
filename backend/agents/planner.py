import json

from langchain_core.messages import HumanMessage, SystemMessage

from agents.llm import llm
from prompts import PLANNER_PROMPT
from schemas import PlannerOutput
from state import AgentState


def planner_agent(state: AgentState) -> AgentState:
  sections = state["parsed_sections"]
  print(
    f"[Planner] Starting — {len(sections)} section(s): {list(sections.keys())}, instructions: {str(state['user_instructions'])[:100]!r}"
  )

  result = llm.with_structured_output(PlannerOutput).invoke(
    [
      SystemMessage(content=PLANNER_PROMPT),
      HumanMessage(
        content=f"Paper sections:\n{json.dumps(sections, indent=2)}\n\nUser instructions:\n{state['user_instructions'] or 'None provided'}"
      ),
    ]
  )

  plan = result.model_dump()
  if not plan.get("files"):
    plan["files"] = [
      "method.py",
      "run_experiment.py",
      "config.yaml",
      "tests/test_smoke.py",
      "report.md",
    ]
  print(f"[Planner] Done — plan keys: {list(plan.keys())}")
  return {**state, "implementation_plan": plan, "status": "planned"}
