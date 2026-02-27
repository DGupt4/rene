from langchain_openai import ChatOpenAI 
from langchain_core.messages import HumanMessage, SystemMessage

from prompts import DEBUGGER_PROMPT
from state import AgentState

llm = ChatOpenAI(base_url="http://127.0.0.1:1234/v1", model="google/gemma-3-12b", api_key="sk-lm-2PGULx4r:xvKyZEs7oqhtIJSlDFwv")

def debugger_agent(state: AgentState) -> AgentState:
  response = llm.invoke([
    SystemMessage(content=DEBUGGER_PROMPT),
    HumanMessage(content=f"""
                  Code:
                  {state["generated_code"]}

                  Error:
                  {state["execution_error"]}
                  """)])

  return {
    **state,
    "generated_code": response.content,
    "revision_count": state["revision_count"] + 1,
    "status": "debugged"
  }