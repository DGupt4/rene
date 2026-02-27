import uuid
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, Form
from graph import graph

app = FastAPI(title="Descartes")

PDF_DIR = Path("../pdfs")
PDF_DIR.mkdir(exist_ok=True)

@app.get("/health")
def health():
  return {"status": "ok"}

@app.post("/generate")
async def generate(file: UploadFile = File(...), prompt: str = Form(...)):
  pdf_path = PDF_DIR / f'{uuid.uuid4()}.pdf'
  pdf_path.write_bytes(await file.read())

  result = await graph.ainvoke({
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
  })

  return result
  # TODO: stream responses