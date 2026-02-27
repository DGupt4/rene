import json
import re

from langchain_core.messages import HumanMessage, SystemMessage

from agents.llm import llm
from prompts import CODER_PROMPT
from state import AgentState


def coder_agent(state: AgentState) -> AgentState:
  plan = state["implementation_plan"]
  sections = state["parsed_sections"]
  methodology = sections.get("methodology") or ""
  print(
    f"[Coder] Starting — plan type: {type(plan).__name__}, methodology length: {len(methodology)}"
  )

  error_history = state.get("error_history", [])
  recode_context = ""
  if error_history:
    last = error_history[-1]
    recode_context = (
      f"\n\nPrevious implementation failed and requires a full rewrite. "
      f"Debugger guidance:\n{last['guidance']}\n\n"
      f"Do NOT repeat the same architectural mistakes."
    )

  review_feedback = state.get("review_feedback")
  review_context = ""
  coming_from_reviewer = review_feedback and state.get("review_iteration", 0) > 0
  if coming_from_reviewer:
    missing = "\n".join(f"- {m}" for m in review_feedback.get("missing", []))
    suggestions = "\n".join(f"- {s}" for s in review_feedback.get("suggestions", []))
    review_context = (
      f"\n\nA previous implementation was reviewed and marked '{review_feedback.get('verdict')}'.\n"
      f"Reviewer summary: {review_feedback.get('summary', '')}\n"
      f"Missing features that MUST be implemented:\n{missing}\n"
      f"Suggestions to address:\n{suggestions}\n\n"
      f"Your new implementation must address ALL of the above."
    )
    print(f"[Coder] Incorporating reviewer feedback (iteration {state['review_iteration']})")

  response = llm.invoke(
    [
      SystemMessage(content=CODER_PROMPT),
      HumanMessage(
        content=f"""Implementation plan:
{json.dumps(plan, indent=2)}

Paper methodology:
{methodology}

Algorithms:
{json.dumps(sections.get("algorithms", []), indent=2)}

User instructions:
{state["user_instructions"] or "None provided"}{recode_context}{review_context}"""
      ),
    ]
  )

  raw = response.content
  match = re.search(r"```(?:python)?\s*([\s\S]*?)```", raw)
  response = match.group(1).strip() if match else raw
  print()
  print(response)
  print()

  updates: dict = {"generated_code": response, "status": "coded"}
  if coming_from_reviewer:
    # Reset debug budget so the new implementation gets fresh revision attempts
    updates["revision_count"] = 0
    updates["error_history"] = []
  return {**state, **updates}
