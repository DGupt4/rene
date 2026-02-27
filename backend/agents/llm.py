import os

from dotenv import load_dotenv
from langchain_openai.chat_models.base import BaseChatOpenAI
from mistralai import Mistral

load_dotenv()

llm = BaseChatOpenAI(
  base_url="https://api.deepseek.com/v1",
  model="deepseek-chat",
  api_key=os.environ["DEEPSEEK_API_KEY"],
  max_tokens=8192,
)

mistral_client = Mistral(api_key=os.environ["MISTRAL_API_KEY"])
