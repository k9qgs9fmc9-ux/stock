import logging
import akshare as ak
import pandas as pd
from agents import llm

logger = logging.getLogger(__name__)

def calculate_technical_indicators(df: pd.DataFrame) -> dict:
    """
    计算技术指标：MA, MACD, KDJ, RSI
    """
    try:
        if df.empty or len(df) < 30:
            return {}

        # 1. MA (Moving Average)
        df['MA5'] = df['收盘'].rolling(window=5).mean()
        df['MA10'] = df['收盘'].rolling(window=10).mean()
        df['MA20'] = df['收盘'].rolling(window=20).mean()
        
        # 2. MACD
        # EMA12
        df['EMA12'] = df['收盘'].ewm(span=12, adjust=False).mean()
        # EMA26
        df['EMA26'] = df['收盘'].ewm(span=26, adjust=False).mean()
        # DIF
        df['DIF'] = df['EMA12'] - df['EMA26']
        # DEA
        df['DEA'] = df['DIF'].ewm(span=9, adjust=False).mean()
        # MACD
        df['MACD'] = 2 * (df['DIF'] - df['DEA'])
        
        # 3. KDJ (Simplified)
        low_list = df['最低'].rolling(window=9, min_periods=9).min()
        high_list = df['最高'].rolling(window=9, min_periods=9).max()
        rsv = (df['收盘'] - low_list) / (high_list - low_list) * 100
        df['K'] = rsv.ewm(com=2, adjust=False).mean()
        df['D'] = df['K'].ewm(com=2, adjust=False).mean()
        df['J'] = 3 * df['K'] - 2 * df['D']

        # 4. RSI (Relative Strength Index) - 6 days
        delta = df['收盘'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=6).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=6).mean()
        rs = gain / loss
        df['RSI6'] = 100 - (100 / (1 + rs))

        latest = df.iloc[-1]
        prev = df.iloc[-2]

        signals = {
            "ma_trend": "Bullish" if latest['MA5'] > latest['MA10'] > latest['MA20'] else "Bearish" if latest['MA5'] < latest['MA10'] < latest['MA20'] else "Neutral",
            "macd_signal": "Golden Cross" if prev['DIF'] < prev['DEA'] and latest['DIF'] > latest['DEA'] else "Death Cross" if prev['DIF'] > prev['DEA'] and latest['DIF'] < latest['DEA'] else "Hold",
            "kdj_signal": "Overbought" if latest['K'] > 80 else "Oversold" if latest['K'] < 20 else "Neutral",
            "rsi_value": round(latest['RSI6'], 2)
        }
        
        # Buy/Sell Logic based on indicators
        recommendation = "HOLD"
        score = 0
        
        # MA Score
        if latest['收盘'] > latest['MA5']: score += 1
        if latest['MA5'] > latest['MA10']: score += 1
        
        # MACD Score
        if latest['MACD'] > 0 and latest['DIF'] > latest['DEA']: score += 2
        
        # RSI Score
        if latest['RSI6'] < 30: score += 2 # Oversold -> Buy
        elif latest['RSI6'] > 70: score -= 2 # Overbought -> Sell
        
        if score >= 3: recommendation = "BUY"
        elif score <= -2: recommendation = "SELL"
        
        return {
            "signals": signals,
            "recommendation": recommendation,
            "latest_price": latest['收盘'],
            "support": round(df['最低'].tail(20).min(), 2),
            "resistance": round(df['最高'].tail(20).max(), 2),
            "indicators": {
                "MA5": round(latest['MA5'], 2),
                "MA20": round(latest['MA20'], 2),
                "MACD": round(latest['MACD'], 3),
                "RSI6": round(latest['RSI6'], 2),
                "K": round(latest['K'], 2),
                "D": round(latest['D'], 2),
                "J": round(latest['J'], 2)
            }
        }
        
    except Exception as e:
        logger.error(f"Error calculating indicators: {e}")
        return {}

def generate_analysis_report(symbol: str) -> str:
    """
    Directly generates an analysis report without using CrewAI's complex agent loop.
    This is more robust against network timeouts and complexity issues.
    """
    code = symbol[-6:]
    logger.info(f"Starting direct analysis for {symbol} ({code})")

    # 1. Fetch Data
    info_str = "无法获取基本信息"
    hist_str = "无法获取历史行情"
    fin_str = "无法获取详细财务数据"
    quant_data = {}

    try:
        # 1.1 Info
        info_df = ak.stock_individual_info_em(symbol=code)
        info_str = info_df.to_string()
    except Exception as e:
        logger.error(f"Failed to fetch info: {e}")

    try:
        # 1.2 History (Last 60 days for calculation, show last 15 in prompt)
        hist_df = ak.stock_zh_a_hist(symbol=code, period="daily", start_date="20230101", adjust="qfq")
        
        # Calculate Quantitative Indicators
        quant_data = calculate_technical_indicators(hist_df)
        
        hist_str = hist_df.tail(15).to_string()
    except Exception as e:
        logger.error(f"Failed to fetch history: {e}")

    try:
        # 1.3 Financials (Abstract) - Try a robust interface or skip if complex
        # Using a simple indicator if possible, or skip to save time/errors
        fin_df = ak.stock_financial_abstract_ths(symbol=code, indicator="按年度")
        fin_str = fin_df.tail(3).to_string()
    except Exception as e:
        # Try fallback
        logger.warning(f"Failed to fetch financials, skipping: {e}")

    # 2. Construct Prompt
    quant_section = ""
    if quant_data:
        quant_section = f"""
### 4. 量化指标分析
- **趋势信号**: {quant_data['signals'].get('ma_trend')}
- **MACD信号**: {quant_data['signals'].get('macd_signal')}
- **RSI数值**: {quant_data['signals'].get('rsi_value')} (Over 70=Overbought, Under 30=Oversold)
- **KDJ状态**: {quant_data['signals'].get('kdj_signal')}
- **关键点位**:
  - 支撑位: {quant_data.get('support')}
  - 阻力位: {quant_data.get('resistance')}
- **量化建议**: {quant_data.get('recommendation')}
- **详细指标**: {quant_data.get('indicators')}
"""

    prompt = f"""
请你作为一名专业的股票分析师，根据以下数据对股票 {symbol} 进行综合分析。

### 1. 股票基本信息
{info_str}

### 2. 近期行情数据 (最近15个交易日)
{hist_str}

### 3. 财务摘要
{fin_str}

{quant_section}

### 分析要求
请生成一份结构清晰的投资分析报告，包含以下部分：
1. **行情回顾**：分析近期的价格趋势、成交量变化及关键支撑/压力位。
2. **基本面简析**：基于可用的财务或基本信息，评价公司的行业地位或财务状况（如数据不足请指出）。
3. **量化买卖点分析**：
   - 结合计算出的技术指标（MA, MACD, KDJ, RSI）进行深度解读。
   - 明确指出当前的量化信号（如金叉/死叉、超买/超卖）。
4. **投资建议**：
   - **操作评级**：【买入】/【增持】/【持有】/【卖出】
   - **关键点位**：
     - **建议买入价**：给出具体的建议买入价格或区间（参考支撑位）。
     - **建议卖出价**：给出具体的建议卖出价格或区间（参考阻力位）。
     - **止损位**：给出明确的止损价格。
   - **风险提示**：提示主要风险点。

请用专业的金融术语，但保持通俗易懂。字数在 600 字左右。重点在于量化数据的解读和具体的买卖点位推荐。
"""

    # 3. Call LLM
    try:
        logger.info("Sending prompt to LLM...")
        response = llm.invoke(prompt)
        return response.content
    except Exception as e:
        logger.error(f"LLM call failed: {e}")
        return f"分析生成失败，原因：{str(e)}。请稍后重试。"
