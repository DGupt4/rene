from langchain_openai import ChatOpenAI 
from langchain_core.messages import HumanMessage, SystemMessage
from prompts import REVIEWER_PROMPT 
from state import AgentState

import json

llm = ChatOpenAI(base_url="http://127.0.0.1:1234/v1", model="google/gemma-3-12b", api_key="sk-lm-2PGULx4r:xvKyZEs7oqhtIJSlDFwv")

def reviewer_agent(state: AgentState) -> AgentState:
  response = llm.invoke([
    SystemMessage(content=REVIEWER_PROMPT),
    HumanMessage(content=f"""
                  Methodology:
                  {state["parsed_sections"].get("methodology", "")}

                  Generated code:
                  {state["generated_code"]}

                  Execution success: {state["execution_success"]}
                  Execution output: {state["execution_output"]}
                  """)])

  return {
    **state,
    "review_feedback": json.loads(response.content),
    "status": "🔍 Review complete",
  }