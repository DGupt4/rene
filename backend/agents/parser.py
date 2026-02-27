import base64
import json

from agents.llm import mistral_client
from prompts import PARSER_PROMPT
from state import AgentState

_ANNOTATION_SCHEMA = {
  "type": "json_schema",
  "json_schema": {
    "name": "paper_sections",
    "schema": {
      "type": "object",
      "properties": {
        "abstract":    {"type": ["string", "null"], "description": "The paper abstract"},
        "methodology": {"type": ["string", "null"], "description": "The full methods/approach section"},
        "algorithms":  {"type": "array", "items": {"type": "string"}, "description": "List of algorithms or pseudocode steps"},
        "libraries":   {"type": "array", "items": {"type": "string"}, "description": "List of libraries/frameworks mentioned"},
      },
      "required": ["abstract", "methodology", "algorithms", "libraries"],
    },
  },
}

def parser_agent(state: AgentState) -> AgentState:
  pdf_path = state["pdf_path"]
  print(f"[Parser] Starting — pdf_path: {pdf_path}")

  with open(pdf_path, "rb") as f:
    pdf_b64 = base64.b64encode(f.read()).decode()

  ocr_response = mistral_client.ocr.process(
    model="mistral-ocr-latest",
    document={"type": "document_url", "document_url": f"data:application/pdf;base64,{pdf_b64}"},
    include_image_base64=True,
    document_annotation_format=_ANNOTATION_SCHEMA,
    document_annotation_prompt=PARSER_PROMPT,
  )

  annotation = ocr_response.document_annotation
  sections = json.loads(annotation) if isinstance(annotation, str) else annotation

  print(f"[Parser] Done — {len(ocr_response.pages)} page(s), sections: {list(sections.keys())}")
  return {
    **state,
    "parsed_sections": sections,
    "status": "parsed",
  }
