from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from state import AgentState
from prompts import CODER_PROMPT

import json

llm = ChatOpenAI(base_url="http://127.0.0.1:1234/v1", model="google/gemma-3-12b", api_key="sk-lm-2PGULx4r:xvKyZEs7oqhtIJSlDFwv")

def coder_agent(state: AgentState) -> AgentState:
  plan = state["implementation_plan"]
  sections = state["parsed_sections"]

  response = llm.invoke([SystemMessage(content=CODER_PROMPT),
                        HumanMessage(content=f"""
                                              Implementation plan:
                                              {json.dumps(plan, indent=2)}

                                              Paper methodology:
                                              {sections.get("methodology", "")}

                                              Algorithms:
                                              {json.dumps(sections.get("algorithms", []), indent=2)}

                                              User instructions:
                                              {state["user_instructions"] or "None provided"} """)])

  return {**state, "generated_code": response.content, "status": "coded"}