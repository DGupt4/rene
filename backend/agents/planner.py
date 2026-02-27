from langchain_openai import ChatOpenAI 
from langchain_core.messages import HumanMessage, SystemMessage
from prompts import PLANNER_PROMPT
from state import AgentState

import json

llm = ChatOpenAI(base_url="http://127.0.0.1:1234/v1", model="google/gemma-3-12b", api_key="sk-lm-2PGULx4r:xvKyZEs7oqhtIJSlDFwv")

def planner_agent(state: AgentState) -> AgentState:
  sections = state["parsed_sections"]

  response = llm.invoke([SystemMessage(content=PLANNER_PROMPT),
                         HumanMessage(content=f"""Paper sections: {json.dumps(sections, indent=2)} User instructions: {state["user_instructions"] or "None provided"}""")])

  return {**state,
    "implementation_plan": json.loads(response.content),
    "status": "planned" }