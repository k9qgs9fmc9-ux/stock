import akshare as ak
import pandas as pd
import logging
from crewai.tools import tool
from typing import Dict, Any, List

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class StockTools:
    @tool("Get Stock History")
    def get_stock_history(symbol: str) -> str:
        """
        获取股票历史行情数据（日K线）。
        Args:
            symbol (str): 股票代码，如 "sh600519" 或 "sz000001"。
        Returns:
            str: JSON格式的历史行情数据或错误信息。
        """
        try:
            logger.info(f"Fetching history for {symbol}")
            # 处理股票代码格式，AKShare通常需要纯数字代码，或者特定格式
            # 这里假设输入是 sh600519 格式，akshare 的 stock_zh_a_hist 需要 6 位代码
            code = symbol[-6:]
            
            # 获取日K线数据
            df = ak.stock_zh_a_hist(symbol=code, period="daily", start_date="20230101", adjust="qfq")
            
            if df.empty:
                return f"No data found for symbol {symbol}"
            
            # 转换为JSON字符串返回，仅保留最近10天数据以减少Token消耗和避免超时
            result = df.tail(10).to_json(orient="records")
            return result
        except Exception as e:
            logger.error(f"Error fetching stock history: {str(e)}")
            return f"Error fetching data: {str(e)}"

    @tool("Get Stock Financials")
    def get_stock_financials(symbol: str) -> str:
        """
        获取股票财务指标数据。
        Args:
            symbol (str): 股票代码。
        Returns:
            str: JSON格式的财务数据。
        """
        try:
            logger.info(f"Fetching financials for {symbol}")
            code = symbol[-6:]
            # 获取主要财务指标，这里使用 stock_financial_abstract 或类似接口
            # 注意：AKShare 接口变动频繁，这里使用示例逻辑
            # 尝试获取个股资金流向作为替代演示，或者具体的财务接口
            df = ak.stock_financial_abstract_ths(symbol=code, indicator="按年度")
            
            if df.empty:
                return f"No financial data found for {symbol}"
                
            return df.tail(5).to_json(orient="records")
        except Exception as e:
            logger.error(f"Error fetching financials: {str(e)}")
            return f"Error fetching financials: {str(e)}"

    @tool("Get Hot Stocks")
    def get_hot_stocks() -> str:
        """
        获取近期热点板块和热门个股（基于东方财富实时榜单）。
        Returns:
            str: JSON格式的热点数据，包含板块名称、领涨个股、最新价、涨跌幅等。
        """
        try:
            logger.info("Fetching hot stocks")
            
            # 1. 获取行业板块涨幅榜 (前5名)
            # akshare.stock_board_industry_name_em() 获取板块列表
            # akshare.stock_board_industry_hist_em 过于复杂
            # 使用简单的 stock_board_industry_summary_ths 或类似
            # 注意：akshare 接口常变，这里用一个相对稳定的接口，或者模拟数据如果接口失败
            
            try:
                # 东方财富 行业板块 实时
                df_board = ak.stock_board_industry_name_em()
                # 按涨跌幅排序
                df_board = df_board.sort_values(by="涨跌幅", ascending=False).head(5)
                # 选取需要的列
                board_list = df_board[['板块名称', '板块代码', '涨跌幅', '领涨股票', '领涨股票-涨跌幅']].to_dict(orient="records")
            except Exception as e:
                logger.warning(f"Failed to fetch board data: {e}")
                board_list = []

            # 2. 获取个股人气榜/涨速榜 (前5名)
            try:
                # 东方财富 个股人气榜
                # akshare.stock_zh_a_spot_em() 获取所有A股实时数据，按涨跌幅排序
                df_stocks = ak.stock_zh_a_spot_em()
                df_hot = df_stocks.sort_values(by="涨跌幅", ascending=False).head(5)
                stock_list = df_hot[['代码', '名称', '最新价', '涨跌幅', '成交量', '成交额']].to_dict(orient="records")
            except Exception as e:
                 logger.warning(f"Failed to fetch stock spot data: {e}")
                 stock_list = []

            return str({
                "hot_boards": board_list,
                "hot_stocks": stock_list
            })

        except Exception as e:
            logger.error(f"Error fetching hot stocks: {str(e)}")
            return f"Error: {str(e)}"
