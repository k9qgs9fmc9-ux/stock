import os
from dotenv import load_dotenv
import httpx
from httpx import Timeout

# --- Monkey Patch httpx.Client to force long timeouts ---
_original_httpx_client_init = httpx.Client.__init__

def _patched_httpx_client_init(self, *args, **kwargs):
    # Force 300s timeout, with 60s connect timeout
    kwargs["timeout"] = Timeout(300.0, connect=60.0)
    _original_httpx_client_init(self, *args, **kwargs)

httpx.Client.__init__ = _patched_httpx_client_init
# --------------------------------------------------------

from crew import StockAnalysisCrew

# Load environment variables
load_dotenv()

# Explicitly set the OpenAI environment variables for the test process
# This is crucial because CrewAI might be reading them directly in some places
os.environ["OPENAI_API_KEY"] = os.getenv("OPENAI_API_KEY")
os.environ["OPENAI_API_BASE"] = os.getenv("OPENAI_API_BASE")
# Ensure testing mode is on to avoid interactive prompts
os.environ["CREWAI_TESTING"] = "true"

def test_full_crew(symbol):
    print(f"Starting full crew test for {symbol}...")
    try:
        crew = StockAnalysisCrew(symbol)
        print("Crew initialized. Starting kickoff...")
        result = crew.run()
        print("\n\n########################")
        print("Crew execution SUCCESS!")
        print("########################\n")
        print(result)
    except Exception as e:
        print("\n\n########################")
        print("Crew execution FAILED!")
        print("########################\n")
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_full_crew("sh600519")
