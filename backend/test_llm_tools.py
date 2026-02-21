import os
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_core.tools import tool

load_dotenv()

api_key = os.getenv("OPENAI_API_KEY")
base_url = os.getenv("OPENAI_API_BASE")

@tool
def get_stock_info(symbol: str):
    """Get stock info."""
    return f"Info for {symbol}"

try:
    print("Initializing LLM with tools...")
    llm = ChatOpenAI(
        model="qwen-plus",
        temperature=0.5,
        api_key=api_key,
        base_url=base_url,
        timeout=300,
        max_retries=5
    )
    
    llm_with_tools = llm.bind_tools([get_stock_info])
    
    print("Invoking LLM with tools...")
    response = llm_with_tools.invoke("Get info for sh600519")
    print("Response received:")
    print(response)

except Exception as e:
    print(f"Error: {e}")
