# Descartes Agent


[https://rene-compiled.vercel.app/]
Password: Dhruv

An AI-powered research assistant that reads a CS/ML paper and automatically generates working code from the methodology section. Built for researchers who want to go from paper to prototype fast.

---

## 💡 The Idea

 This tool takes a PDF of a research paper, extracts the method section, and uses a multi-agent pipeline to plan and generate clean, runnable Python co. A live frontend lets you watch the agents work in real time.

---

## 🏗️ Architecture

```
PDF Upload + User Instructions
        ↓
  [ Parser Agent ]       → Extracts abstract, methodology, algorithms from the PDF
        ↓
  [ Planner Agent ]      → Produces a structured implementation plan
        ↓
  [ Coder Agent ]        → Generates modular, commented Python code
        ↓
  [ Reviewer Agent ]     → Critiques code against the paper, loops back if needed
        ↓
  Final Code Output
```

The frontend streams agent activity live via **Server-Sent Events (SSE)**, so you can watch each step as it happens.

---

## 🚀 Running the Project

### 1. Clone

```bash
git clone https://github.com/DGupt4/rene.git
cd rene 
```

---

### 2. Backend

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cd backend
uvicorn main:app --reload --port 8000
```

---

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

---
