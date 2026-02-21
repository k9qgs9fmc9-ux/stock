from crewai import Task
from textwrap import dedent

class StockAnalysisTasks:
    def research_task(self, agent, stock_symbol):
        return Task(
            description=dedent(f"""
                对股票 {stock_symbol} 进行全面的数据收集。
                1. 获取该股票的最新实时价格信息。
                2. 获取最近30个交易日的历史行情数据（开盘、收盘、最高、最低、成交量）。
                3. 获取最近的年度或季度财务摘要数据。
                
                确保数据获取成功，如果某个工具失败，尝试记录错误并继续获取其他数据。
                整理收集到的所有数据，以结构化的文本形式输出，供后续分析师使用。
            """),
            agent=agent,
            expected_output="包含实时行情、历史数据摘要和财务数据的综合数据报告。"
        )

    def fundamental_analysis_task(self, agent):
        return Task(
            description=dedent("""
                基于市场研究员提供的数据，进行基本面分析。
                1. 分析公司的营收和利润趋势。
                2. 评估公司的财务健康状况（如负债率、现金流，如果有数据）。
                3. 计算或评估当前的估值水平（如PE、PB，结合行业情况）。
                4. 总结公司的竞争优势和潜在风险。
            """),
            agent=agent,
            expected_output="一份详细的基本面分析报告，包含财务健康评分和估值评估。"
        )

    def technical_analysis_task(self, agent):
        return Task(
            description=dedent("""
                基于市场研究员提供的历史行情数据，进行技术面分析。
                1. 分析当前的价格趋势（上升、下降、震荡）。
                2. 识别关键的支撑位和压力位。
                3. 利用技术指标（如MA趋势，成交量变化）判断短期动能。
                4. 给出短期内的交易信号（看多/看空/中性）。
            """),
            agent=agent,
            expected_output="一份详细的技术面分析报告，包含趋势判断、关键点位和交易信号。"
        )

    def investment_recommendation_task(self, agent):
        return Task(
            description=dedent("""
                作为首席投资顾问，审阅基本面分析和技术面分析报告。
                1. 综合两者的观点，如果存在冲突，说明如何权衡（例如基本面好但技术面差）。
                2. 给出最终的投资评级：【强力买入】、【买入】、【持有】、【卖出】或【强力卖出】。
                3. 设定具体的目标价格区间和止损位。
                4. 撰写最终的投资建议摘要，语言要专业且有说服力。
            """),
            agent=agent,
            expected_output="最终投资建议报告，包含评级、目标价、止损位及核心逻辑摘要。"
        )
