import os
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

load_dotenv()

api_key = os.getenv("OPENAI_API_KEY")
base_url = os.getenv("OPENAI_API_BASE")

print(f"API Key: {api_key[:5]}...{api_key[-5:]}")
print(f"Base URL: {base_url}")

try:
    llm = ChatOpenAI(
        model="qwen-plus",
        temperature=0.5,
        api_key=api_key,
        base_url=base_url
    )
    print("Attempting to invoke LLM...")
    response = llm.invoke("Hello, are you working?")
    print("Response received:")
    print(response)
except Exception as e:
    print(f"Error: {e}")
