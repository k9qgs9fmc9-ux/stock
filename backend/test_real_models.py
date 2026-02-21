import os
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
import httpx

load_dotenv()

api_key = os.getenv("OPENAI_API_KEY")
base_url = os.getenv("OPENAI_API_BASE")

# 显式设置超时
http_client = httpx.Client(timeout=30.0)

models_to_test = ["qwen2.5-turbo", "qwen-turbo", "qwen-plus", "qwen2.5-72b-instruct"]

for model in models_to_test:
    print(f"\nTesting model: {model}")
    try:
        llm = ChatOpenAI(
            model=model,
            temperature=0.5,
            api_key=api_key,
            base_url=base_url,
            http_client=http_client,
            max_retries=1
        )
        response = llm.invoke("Hello, simply reply 'OK'.")
        print(f"✅ Success with {model}: {response.content}")
    except Exception as e:
        print(f"❌ Failed with {model}: {str(e)}")
