from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from state import AgentState
from prompts import PARSER_PROMPT

import fitz
import json

llm = ChatOpenAI(base_url="http://127.0.0.1:1234/v1", model="google/gemma-3-12b", api_key="sk-lm-2PGULx4r:xvKyZEs7oqhtIJSlDFwv")

def parser_agent(state: AgentState) -> AgentState:

  doc = fitz.open(state["pdf_path"])
  raw_text = "\n".join([page.get_text() for page in doc])

  response = llm.invoke([SystemMessage(content=PARSER_PROMPT), HumanMessage(content=f"Parse this paper:\n\n{raw_text[:12000]}")])

  return {**state, "parsed_sections": json.loads(response.content), "status": "parsed"}