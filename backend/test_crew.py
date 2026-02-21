import os
from dotenv import load_dotenv
from crewai import Agent, Task, Crew, Process
from langchain_openai import ChatOpenAI
from tools import StockTools

load_dotenv()

# Mocking the agents setup for a quick test
llm = ChatOpenAI(
    model="qwen-plus",
    temperature=0.5,
    api_key=os.getenv("OPENAI_API_KEY"),
    base_url=os.getenv("OPENAI_API_BASE"),
    timeout=300,
    max_retries=5
)

def create_crew(symbol):
    print(f"Creating crew for {symbol}...")
    
    researcher = Agent(
        role='Market Researcher',
        goal='收集并验证全面的股票市场数据',
        backstory="你是一名经验丰富的市场研究员。",
        tools=[StockTools.get_stock_info], # Only one tool for testing
        llm=llm,
        verbose=True,
        allow_delegation=False
    )

    task = Task(
        description=f"获取股票 {symbol} 的最新实时价格信息。",
        agent=researcher,
        expected_output="股票实时价格信息。"
    )

    crew = Crew(
        agents=[researcher],
        tasks=[task],
        verbose=True,
        process=Process.sequential
    )
    
    return crew

if __name__ == "__main__":
    try:
        symbol = "sh600519"
        crew = create_crew(symbol)
        print("Starting crew kickoff...")
        result = crew.kickoff()
        print("Crew execution result:")
        print(result)
    except Exception as e:
        print(f"Error executing crew: {e}")
