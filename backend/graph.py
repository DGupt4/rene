from langgraph.graph import END, START, StateGraph

from agents.coder import coder_agent
from agents.debugger import debugger_agent
from agents.executor import executor_agent
from agents.parser import parser_agent
from agents.planner import planner_agent
from agents.reviewer import reviewer_agent
from state import AgentState

MAX_REVISIONS = 3


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
  return "executor"


def build_graph() -> StateGraph:
  graph = StateGraph(AgentState)
  graph.add_node("parser", parser_agent)
  graph.add_node("planner", planner_agent)
  graph.add_node("coder", coder_agent)
  graph.add_node("executor", executor_agent)
  graph.add_node("debugger", debugger_agent)
  graph.add_node("reviewer", reviewer_agent)

  graph.add_edge(START, "parser")
  graph.add_edge("parser", "planner")
  graph.add_edge("planner", "coder")
  graph.add_edge("coder", "executor")
  graph.add_conditional_edges("executor", route_after_executor)
  graph.add_conditional_edges("debugger", route_after_debugger)
  graph.add_edge("reviewer", END)

  return graph.compile()


graph = build_graph()