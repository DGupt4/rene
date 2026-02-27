import subprocess
import tempfile

from state import AgentState

def executor_agent(state: AgentState) -> AgentState:
  code = state["generated_code"]

  with tempfile.NamedTemporaryFile(suffix=".py", mode="w", delete=False) as f:
    f.write(code)
    tmp_path = f.name

  result = subprocess.run(["python", tmp_path], capture_output=True, text=True, timeout=30,)
  success = result.returncode == 0

  return {
    **state,
    "execution_output": result.stdout,
    "execution_error": result.stderr if not success else "",
    "execution_success": success,
    "status": "executed successfully" if success else "execution failed",
  }