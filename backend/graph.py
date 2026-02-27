import os

from langgraph.graph import END, START, StateGraph

from agents.coder import coder_agent
from agents.debugger import debugger_agent
from agents.executor import executor_agent
from agents.github_publisher import github_publisher_agent
from agents.parser import parser_agent
from agents.planner import planner_agent
from agents.reviewer import reviewer_agent
from state import AgentState

MAX_REVISIONS = 3
MAX_REVIEW_ITERATIONS = 2


def _publish_enabled() -> bool:
  token = os.environ.get("GITHUB_TOKEN", "").strip()
  return bool(token)



def route_after_executor(state: AgentState) -> str:
  if state["execution_success"]:
    return "reviewer"
  elif state["revision_count"] >= MAX_REVISIONS:
    print(
      f"[Graph] Max revisions ({MAX_REVISIONS}) reached — routing to reviewer without re-executing"
    )
    return "reviewer"
  else:
    return "debugger"


def route_after_debugger(state: AgentState) -> str:
  if state["revision_count"] >= MAX_REVISIONS:
    print(f"[Graph] Max revisions ({MAX_REVISIONS}) reached after debug — routing to reviewer")
    return "reviewer"
  if state["debug_action"] == "recode":
    return "coder"
  return "executor"


def route_after_reviewer(state: AgentState) -> str:
  publish_target = "github_publisher" if _publish_enabled() else END
  feedback = state.get("review_feedback", {})
  verdict = feedback.get("verdict", "complete")
  if verdict == "complete":
    return publish_target
  if state.get("review_iteration", 0) >= MAX_REVIEW_ITERATIONS:
    print(
      f"[Graph] Max review iterations ({MAX_REVIEW_ITERATIONS}) reached — ending despite verdict '{verdict}'"
    )
    return publish_target
  print(f"[Graph] Reviewer verdict '{verdict}' — routing back to coder for revision")
  return "coder"


def build_graph() -> StateGraph:
  graph = StateGraph(AgentState)
  graph.add_node("parser", parser_agent)
  graph.add_node("planner", planner_agent)
  graph.add_node("coder", coder_agent)
  graph.add_node("executor", executor_agent)
  graph.add_node("debugger", debugger_agent)
  graph.add_node("reviewer", reviewer_agent)
  graph.add_node("github_publisher", github_publisher_agent)

  graph.add_edge(START, "parser")
  graph.add_edge("parser", "planner")
  graph.add_edge("planner", "coder")
  graph.add_edge("coder", "executor")
  graph.add_conditional_edges("executor", route_after_executor)
  graph.add_conditional_edges("debugger", route_after_debugger)
  graph.add_conditional_edges("reviewer", route_after_reviewer)
  graph.add_edge("github_publisher", END)

  return graph.compile()

graph = build_graph()
print(graph.get_graph().draw_mermaid())
