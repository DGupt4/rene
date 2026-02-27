from langgraph.graph import START, END, StateGraph
from agents.parser import parser_agent
from agents.coder import coder_agent
from agents.executor import executor_agent    
from agents.debugger import debugger_agent
from agents.reviewer import reviewer_agent
from agents.planner import planner_agent 
from state import AgentState

def route_debugger(state: AgentState) -> str:
  if state["execution_success"]:
    return "reviewer"
  else:
    return "debugger"

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
  graph.add_edge("executor", "debugger")
  graph.add_conditional_edges("executor", route_debugger)
  graph.add_edge("debugger", "reviewer")
  graph.add_edge("reviewer", END)

  return graph.compile()

graph = build_graph()