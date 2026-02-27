from langchain_core.messages import HumanMessage, SystemMessage

from agents.llm import llm
from prompts import DEBUGGER_PROMPT
from schemas import DebuggerOutput
from state import AgentState

_structured_llm = llm.with_structured_output(DebuggerOutput)


def debugger_agent(state: AgentState) -> AgentState:
  revision = state["revision_count"]
  error = state["execution_error"]
  print(f"[Debugger] Starting — revision {revision}, error: {error[:200]!r}")

  error_history = state.get("error_history", [])

  history_text = ""
  if error_history:
    history_text = "\n\nPrevious debug attempts:\n" + "\n---\n".join(
      f"Attempt {i + 1} — Action taken: {e['action']}\n"
      f"Error: {e['error'][:300]}\n"
      f"Analysis: {e['analysis']}"
      for i, e in enumerate(error_history)
    )

  result: DebuggerOutput | None = None
  try:
    result = _structured_llm.invoke([
      SystemMessage(content=DEBUGGER_PROMPT),
      HumanMessage(
        content=f"Code:\n{state['generated_code']}\n\nError:\n{error}{history_text}"
      ),
    ])
  except Exception as exc:
    print(f"[Debugger] Structured output failed: {exc!r}")

  if result is None:
    fallback_analysis = (
      "Debugger model returned no structured output; falling back to recode."
    )
    fallback_guidance = (
      "Produce a simpler, bounded implementation that avoids infinite loops and "
      "ensures run_experiment(config_path) returns quickly with JSON-serializable metrics."
    )
    print(f"[Debugger] Analysis: {fallback_analysis}")
    print("[Debugger] Decision: recode")
    new_history = [
      *error_history,
      {
        "error": error,
        "analysis": fallback_analysis,
        "action": "recode",
        "guidance": fallback_guidance,
      },
    ]
    return {
      **state,
      "revision_count": revision + 1,
      "error_history": new_history,
      "debug_action": "recode",
      "status": "recode requested",
    }

  print(f"[Debugger] Analysis: {result.analysis[:300]}")
  print(f"[Debugger] Decision: {result.action}")

  new_history = [
    *error_history,
    {
      "error": error,
      "analysis": result.analysis,
      "action": result.action,
      "guidance": result.output if result.action == "recode" else None,
    },
  ]

  if result.action == "patch":
    print(f"[Debugger] Patching — revised code is {len(result.output)} chars")
    return {
      **state,
      "generated_code": result.output,
      "revision_count": revision + 1,
      "error_history": new_history,
      "debug_action": result.action,
      "status": "debugged",
    }
  else:
    print("[Debugger] Recoding — routing back to coder with guidance")
    return {
      **state,
      "revision_count": revision + 1,
      "error_history": new_history,
      "debug_action": result.action,
      "status": "recode requested",
    }
