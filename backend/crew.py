from crewai import Crew, Process
from agents import StockAnalysisAgents
from tasks import StockAnalysisTasks

class StockAnalysisCrew:
    def __init__(self, stock_symbol):
        self.stock_symbol = stock_symbol
        self.agents = StockAnalysisAgents()
        self.tasks = StockAnalysisTasks()

    def run(self):
        # 初始化 Agents
        researcher = self.agents.market_researcher()
        fundamental_analyst = self.agents.fundamental_analyst()
        technical_analyst = self.agents.technical_analyst()
        advisor = self.agents.investment_advisor()

        # 初始化 Tasks
        research_task = self.tasks.research_task(researcher, self.stock_symbol)
        fundamental_task = self.tasks.fundamental_analysis_task(fundamental_analyst)
        technical_task = self.tasks.technical_analysis_task(technical_analyst)
        recommendation_task = self.tasks.investment_recommendation_task(advisor)

        # 设定任务上下文依赖
        # fundamental_task 和 technical_task 依赖 research_task 的输出
        fundamental_task.context = [research_task]
        technical_task.context = [research_task]
        # recommendation_task 依赖前两者的输出
        recommendation_task.context = [fundamental_task, technical_task]

        # 组建 Crew
        crew = Crew(
            agents=[researcher, fundamental_analyst, technical_analyst, advisor],
            tasks=[research_task, fundamental_task, technical_task, recommendation_task],
            verbose=True,
            process=Process.sequential # 顺序执行
        )

        result = crew.kickoff()
        return str(result)
