import json
import uuid
from pathlib import Path

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse

from graph import graph

app = FastAPI(title="Descartes")

app.add_middleware(
  CORSMiddleware,
  allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)

PDF_DIR = Path("../pdfs")
PDF_DIR.mkdir(parents=True, exist_ok=True)


@app.get("/health")
def health():
  return {"status": "ok"}


@app.post("/generate")
async def generate(file: UploadFile = File(...), prompt: str = Form(...)):
  pdf_path = PDF_DIR / f"{uuid.uuid4()}.pdf"
  pdf_path.write_bytes(await file.read())

  result = await graph.ainvoke(
    {
      "pdf_path": str(pdf_path),
      "user_instructions": prompt,
      "parsed_sections": {},
      "implementation_plan": "",
      "generated_code": "",
      "review_feedback": "",
      "revision_count": 0,
      "status": "initialized",
      "execution_output": "",
      "execution_error": "",
      "execution_success": False,
    }
  )

  return result


@app.post("/generate-stream")
async def generate_stream(file: UploadFile = File(...), prompt: str = Form(...)):
  pdf_path = PDF_DIR / f"{uuid.uuid4()}.pdf"
  pdf_path.write_bytes(await file.read())

  initial_state = {
    "pdf_path": str(pdf_path),
    "user_instructions": prompt,
    "parsed_sections": {},
    "implementation_plan": "",
    "generated_code": "",
    "review_feedback": "",
    "revision_count": 0,
    "status": "initialized",
    "execution_output": "",
    "execution_error": "",
    "execution_success": False,
  }

  async def event_generator():
    last_state = initial_state
    async for event in graph.astream(initial_state):
      # event is a dict with a single key: the node name that just completed
      for node_name, node_state in event.items():
        last_state = {**last_state, **node_state}
        yield {
          "event": "agent",
          "data": json.dumps({
            "node": node_name,
            "status": "completed",
            "data": _serialize_state(node_state),
          }),
        }
    yield {
      "event": "agent",
      "data": json.dumps({
        "node": "done",
        "status": "completed",
        "data": _serialize_state(last_state),
      }),
    }

  return EventSourceResponse(event_generator())


def _serialize_state(state: dict) -> dict:
  """Make state JSON-serializable by converting non-serializable values."""
  out = {}
  for k, v in state.items():
    try:
      json.dumps(v)
      out[k] = v
    except (TypeError, ValueError):
      out[k] = str(v)
  return out