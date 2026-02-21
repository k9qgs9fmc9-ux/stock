from crewai import Agent
from langchain_openai import ChatOpenAI
from tools import StockTools
import os
from dotenv import load_dotenv

load_dotenv()

import httpx

# 实例化LLM，默认使用环境变量中的 OPENAI_API_KEY
# 如果需要使用其他模型，可以在这里配置
# 使用 httpx.Client 显式设置超时
http_client = httpx.Client(timeout=httpx.Timeout(300.0, connect=60.0))

llm = ChatOpenAI(
    model="qwen-plus", # 阿里云建议使用 qwen-plus 作为主力模型，性价比和稳定性较好
    temperature=0.5,
    api_key=os.getenv("OPENAI_API_KEY"),
    base_url=os.getenv("OPENAI_API_BASE"),
    http_client=http_client,
    max_retries=5
)

class StockAnalysisAgents:
    def market_researcher(self):
        return Agent(
            role='Market Researcher',
            goal='收集并验证全面的股票市场数据',
            backstory="""你是一名经验丰富的市场研究员，擅长从各种来源挖掘精确的股票数据。
            你的职责是为团队提供准确的实时行情、历史价格走势和基础财务数据。
            你需要确保数据的时效性和准确性，为后续分析打下坚实基础。""",
            tools=[
                StockTools.get_stock_history,
                StockTools.get_stock_financials,
                StockTools.get_stock_info
            ],
            llm=llm,
            verbose=True,
            allow_delegation=False
        )

    def fundamental_analyst(self):
        return Agent(
            role='Fundamental Analyst',
            goal='分析公司财务状况和内在价值',
            backstory="""你是一名专注于价值投资的基本面分析师。
            你擅长解读财务报表（如营收、利润、现金流），评估公司的盈利能力、偿债能力和成长性。
            你的任务是判断该公司的当前估值是否合理，以及未来的增长潜力。""",
            tools=[], # 依赖研究员提供的数据
            llm=llm,
            verbose=True,
            allow_delegation=False
        )

    def technical_analyst(self):
        return Agent(
            role='Technical Analyst',
            goal='基于图表和指标分析价格趋势',
            backstory="""你是一名敏锐的技术分析师，相信价格包容一切。
            你擅长利用K线形态、均线系统（MA）、MACD、RSI等技术指标来识别趋势、支撑位和压力位。
            你的任务是判断当前的买卖时机，并给出具体的入场点（买入区间）、止损点和止盈点建议。""",
            tools=[], # 依赖研究员提供的数据
            llm=llm,
            verbose=True,
            allow_delegation=False
        )

    def investment_advisor(self):
        return Agent(
            role='Chief Investment Advisor',
            goal='综合各方信息给出最终投资建议',
            backstory="""你是团队的首席投资顾问，拥有宏观视野和丰富的资产管理经验。
            你需要综合基本面分析师和技术分析师的报告，权衡风险与收益。
            你的最终产出是一份专业的投资建议报告，必须明确包含以下内容：
            1. 投资评级（买入/增持/持有/卖出）
            2. 具体的买入价格区间
            3. 明确的止损价格
            4. 具体的止盈目标价（短期/中期）
            5. 主要风险提示
            你需要用通俗易懂但专业的语言向客户解释你的决策逻辑。""",
            tools=[],
            llm=llm,
            verbose=True,
            allow_delegation=False
        )
