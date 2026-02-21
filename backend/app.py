import os
from dotenv import load_dotenv
import openai
from httpx import Timeout

# --- Patch OpenAI Client to force timeouts ---
# This ensures that ANY OpenAI client created by CrewAI or LangChain uses a long timeout
_original_openai_init = openai.OpenAI.__init__

def _patched_openai_init(self, *args, **kwargs):
    # Force 300s timeout
    kwargs['timeout'] = 300.0
    # We can also force max_retries
    if 'max_retries' not in kwargs:
        kwargs['max_retries'] = 5
    _original_openai_init(self, *args, **kwargs)

openai.OpenAI.__init__ = _patched_openai_init
# ---------------------------------------------

# 加载环境变量
load_dotenv()

# --- 关键修复：解决 CrewAI 在 macOS 上写入系统目录权限问题 ---
# CrewAI 使用 appdirs 获取存储路径，我们需要 Patch 它以使用本地目录
try:
    import appdirs
    
    def patched_user_data_dir(appname=None, appauthor=None, version=None, roaming=False):
        # 强制重定向到项目本地的 .data 目录
        local_data_dir = os.path.join(os.getcwd(), ".data")
        if appname:
            local_data_dir = os.path.join(local_data_dir, appname)
        return local_data_dir

    # 覆盖模块级别的函数
    appdirs.user_data_dir = patched_user_data_dir
    appdirs.user_config_dir = patched_user_data_dir
    appdirs.user_cache_dir = patched_user_data_dir
    appdirs.site_data_dir = patched_user_data_dir
    appdirs.site_config_dir = patched_user_data_dir
    
except ImportError:
    pass
# -----------------------------------------------------------

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
from crew import StockAnalysisCrew
from tools import StockTools
import logging
import json
import datetime
import os

# 初始化 FastAPI
app = FastAPI(title="Stock Analysis API", version="1.0.0")

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # 生产环境应限制为前端域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 日志配置
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AnalyzeRequest(BaseModel):
    symbol: str
    mode: str = "direct" # direct, agent, mixed

@app.get("/")
def read_root():
    return {"message": "Stock Analysis API is running"}

from direct_analysis import generate_analysis_report

@app.post("/api/analyze")
def analyze_stock(request: AnalyzeRequest):
    """
    触发全流程股票分析
    """
    symbol = request.symbol
    logger.info(f"Received analysis request for {symbol} with mode {request.mode}")
    
    try:
        # 获取股票名称
        stock_name = symbol
        try:
            import akshare as ak
            code = symbol[-6:]
            info = ak.stock_individual_info_em(symbol=code)
            # info 是一个 DataFrame，查找 item 为 '股票简称' 的 value
            name_row = info[info['item'] == '股票简称']
            if not name_row.empty:
                stock_name = name_row.iloc[0]['value']
        except Exception as e:
            logger.warning(f"Failed to fetch stock name: {e}")

        reports = {}
        
        # 1. Direct Analysis (Fast, Robust)
        if request.mode in ["direct", "mixed"]:
            try:
                reports["direct"] = generate_analysis_report(symbol)
            except Exception as e:
                reports["direct"] = f"Direct analysis failed: {str(e)}"

        # 2. Agent Analysis (Deep, but potentially slow)
        if request.mode in ["agent", "mixed"]:
            try:
                crew = StockAnalysisCrew(symbol)
                reports["agent"] = crew.run()
            except Exception as e:
                reports["agent"] = f"Agent analysis failed: {str(e)}"
        
        # Fallback for backward compatibility (if frontend expects single 'report')
        primary_report = reports.get("direct") or reports.get("agent") or "No report generated"

        return {
            "symbol": symbol,
            "name": stock_name,
            "report": primary_report, # Legacy field
            "reports": reports # New field for multi-mode
        }
    except Exception as e:
        logger.error(f"Analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/hot")
def get_hot_stocks():
    try:
        import akshare as ak
        
        # 1. Boards
        board_list = []
        try:
            # Primary: Industry Boards
            df_board = ak.stock_board_industry_name_em()
            df_board = df_board.sort_values(by="涨跌幅", ascending=False).head(6)
            board_list = df_board[['板块名称', '板块代码', '涨跌幅', '领涨股票', '领涨股票-涨跌幅']].to_dict(orient="records")
        except Exception as e:
            logger.warning(f"Failed industry board: {e}")
            # Fallback: Concept Boards
            try:
                df_concept = ak.stock_board_concept_name_em()
                df_concept = df_concept.sort_values(by="涨跌幅", ascending=False).head(6)
                board_list = df_concept[['板块名称', '板块代码', '涨跌幅', '领涨股票', '领涨股票-涨跌幅']].to_dict(orient="records")
            except Exception as e2:
                logger.warning(f"Failed concept board fallback: {e2}")
                board_list = []
            
        # 2. Stocks
        stock_list = []
        try:
            # Primary: Real-time Spot Data (Top Gainers)
            df_stocks = ak.stock_zh_a_spot_em()
            df_hot = df_stocks.sort_values(by="涨跌幅", ascending=False).head(6)
            stock_list = df_hot[['代码', '名称', '最新价', '涨跌幅', '成交量', '成交额']].to_dict(orient="records")
        except Exception as e:
            logger.warning(f"Failed stock spot: {e}")
            stock_list = []
            
        # Fallback for Stocks: Popularity Rank (stock_hot_rank_em)
        # This is useful when spot data is empty/unavailable (e.g. non-trading hours network issue)
        # or simply to ensure we have "Hot" stocks from the last trading session.
        if len(stock_list) == 0:
            try:
                logger.info("Using stock_hot_rank_em as fallback")
                df_rank = ak.stock_hot_rank_em()
                df_rank = df_rank.head(6)
                processed_list = []
                for _, row in df_rank.iterrows():
                    code = str(row['代码'])
                    # Strip prefix (SH/SZ)
                    if code.upper().startswith('SH') or code.upper().startswith('SZ'):
                        code = code[2:]
                    
                    processed_list.append({
                        "代码": code,
                        "名称": row['股票名称'],
                        "最新价": row['最新价'],
                        "涨跌幅": row['涨跌幅'],
                        "成交量": 0, 
                        "成交额": 0
                    })
                stock_list = processed_list
            except Exception as e2:
                logger.warning(f"Failed stock rank fallback: {e2}")

        result = {"boards": board_list, "stocks": stock_list, "fallback": False, "asof": datetime.date.today().isoformat()}
        if len(board_list) == 0 and len(stock_list) == 0:
            cache_dir = os.path.join(os.getcwd(), ".data", "cache")
            cache_path = os.path.join(cache_dir, "hot.json")
            try:
                with open(cache_path, "r", encoding="utf-8") as f:
                    cached = json.load(f)
                cached["fallback"] = True
                return cached
            except Exception as ce:
                logger.warning(f"No hot cache available: {ce}")
                return result
        else:
            try:
                cache_dir = os.path.join(os.getcwd(), ".data", "cache")
                os.makedirs(cache_dir, exist_ok=True)
                cache_path = os.path.join(cache_dir, "hot.json")
                to_cache = dict(result)
                to_cache["cached_at"] = datetime.datetime.utcnow().isoformat()
                with open(cache_path, "w", encoding="utf-8") as f:
                    json.dump(to_cache, f, ensure_ascii=False)
            except Exception as we:
                logger.warning(f"Failed to write hot cache: {we}")
            return result
    except Exception as e:
        logger.error(f"Error hot: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/kline")
def get_kline(symbol: str, period: str = "daily", adjust: str = "qfq"):
    """
    获取K线数据，直接供前端图表使用
    :param symbol: 股票代码
    :param period: 周期 daily, weekly, monthly
    :param adjust: 复权 qfq, hfq, ""
    """
    try:
        # 复用 Tools 中的逻辑，但直接返回 JSON 对象
        import akshare as ak
        code = symbol[-6:]
        
        # 获取股票名称
        stock_name = symbol
        try:
            info = ak.stock_individual_info_em(symbol=code)
            name_row = info[info['item'] == '股票简称']
            if not name_row.empty:
                stock_name = name_row.iloc[0]['value']
        except Exception as e:
            logger.warning(f"Failed to fetch stock name: {e}")

        # Map period to akshare parameters
        # ak.stock_zh_a_hist supports period="daily", "weekly", "monthly"
        # For minutes, we need stock_zh_a_hist_min_em
        
        if period in ["daily", "weekly", "monthly"]:
            start_date = "20200101" # Load more history for weekly/monthly
            if period == "daily":
                start_date = "20230101"
            
            df = ak.stock_zh_a_hist(symbol=code, period=period, start_date=start_date, adjust=adjust)
        
        elif period in ["1", "5", "15", "30", "60"]:
            # Minute data
            # adjust is usually not supported for minute data in free API, or check documentation
            # stock_zh_a_hist_min_em(symbol="000001", start_date="2024-01-01 09:30:00", end_date="2024-01-01 15:00:00", period="1", adjust="qfq")
            # It seems it supports adjust.
            df = ak.stock_zh_a_hist_min_em(symbol=code, period=period, adjust=adjust)
        else:
            # Default to daily
            df = ak.stock_zh_a_hist(symbol=code, period="daily", start_date="20230101", adjust=adjust)
        
        if df.empty:
             raise HTTPException(status_code=404, detail="No data found")
             
        # Rename columns based on period type
        # Minute data columns: 时间, 开盘, 收盘, 最高, 最低, 成交量, 成交额, ...
        # Daily data columns: 日期, 开盘, 收盘, 最高, 最低, 成交量, ...
        
        rename_map = {
            "日期": "date_str",
            "时间": "date_str",
            "开盘": "open",
            "最高": "high",
            "最低": "low",
            "收盘": "close",
            "成交量": "volume"
        }
        df = df.rename(columns=rename_map)
        
        # 转换日期为时间戳 (毫秒)
        df['timestamp'] = pd.to_datetime(df['date_str']).apply(lambda x: x.timestamp() * 1000)
        
        data = df[['timestamp', 'open', 'high', 'low', 'close', 'volume']].to_dict(orient="records")
        
        return {
            "name": stock_name,
            "symbol": symbol,
            "data": data
        }
    except Exception as e:
        logger.error(f"Error fetching kline: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/recommend")
def get_recommended_stocks():
    """
    获取推荐买入的个股 (1-3只)
    基于量化指标筛选：MA多头排列 + MACD金叉 + RSI超卖反弹
    """
    try:
        import akshare as ak
        from direct_analysis import calculate_technical_indicators
        
        # 1. 获取热门股票候选池 (从热点榜单中筛选，保证活跃度)
        candidates = []
        try:
            # 使用个股人气榜前20作为候选
            df_rank = ak.stock_hot_rank_em().head(20)
            for _, row in df_rank.iterrows():
                code = str(row['代码'])
                if code.upper().startswith('SH') or code.upper().startswith('SZ'):
                    code = code[2:]
                candidates.append({"code": code, "name": row['股票名称']})
        except Exception as e:
            logger.warning(f"Failed to fetch rank candidates: {e}")
            # Fallback candidates if rank fails
            candidates = [{"code": "600519", "name": "贵州茅台"}, {"code": "000001", "name": "平安银行"}]
            
        recommended = []
        
        # 2. 遍历计算指标
        for stock in candidates:
            if len(recommended) >= 3:
                break
                
            try:
                code = stock['code']
                # 获取历史数据
                df = ak.stock_zh_a_hist(symbol=code, period="daily", start_date="20230101", adjust="qfq")
                
                if df.empty or len(df) < 60:
                    continue
                    
                # 计算指标
                indicators = calculate_technical_indicators(df)
                if not indicators:
                    continue
                    
                signals = indicators.get('signals', {})
                rec = indicators.get('recommendation', 'HOLD')
                
                # 筛选逻辑：必须是 BUY 评级，或者至少是 Bullish 趋势且未超买
                is_buy = rec == "BUY"
                is_potential = signals.get('ma_trend') == "Bullish" and signals.get('kdj_signal') != "Overbought"
                
                if is_buy or is_potential:
                    recommended.append({
                        "code": code,
                        "name": stock['name'],
                        "price": indicators['latest_price'],
                        "reason": f"量化评级: {rec}, 趋势: {signals.get('ma_trend')}, 信号: {signals.get('macd_signal')}",
                        "support": indicators.get('support'),
                        "resistance": indicators.get('resistance')
                    })
            except Exception as e:
                logger.warning(f"Error analyzing candidate {stock['code']}: {e}")
                continue
        
        # If no stocks found (market is bad), return defensive stocks or empty
        if not recommended and candidates:
             # Just return top 1 with a note if strictly no buy signal
             top = candidates[0]
             recommended.append({
                 "code": top['code'],
                 "name": top['name'],
                 "price": 0,
                 "reason": "市场情绪低迷，暂无强力买入信号，关注龙头",
                 "support": 0,
                 "resistance": 0
             })
             
        return recommended
        
    except Exception as e:
        logger.error(f"Error fetching recommendations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# 股票搜索缓存
_stock_list_cache = None

def _get_stock_list():
    """获取股票列表（带缓存）并附带首字母与拼音全称字段"""
    global _stock_list_cache
    if _stock_list_cache is not None:
        return _stock_list_cache
    
    import akshare as ak
    from pypinyin import lazy_pinyin, STYLE_FIRST_LETTER
    
    df = ak.stock_info_a_code_name()

    def get_initials(name):
        cleaned = str(name).replace('*', '').replace('ST', '').replace('Ａ', 'A').replace(' ', '')
        py = lazy_pinyin(cleaned, style=STYLE_FIRST_LETTER)
        return ''.join(py).upper()
    
    def get_pinyin_full(name):
        py = lazy_pinyin(str(name))
        return ''.join(py).upper()
    
    stocks = []
    for _, row in df.iterrows():
        code = str(row['code']).zfill(6)
        name = str(row['name']).strip()
        # 判断市场
        if code.startswith('6'):
            market = 'sh'
        elif code.startswith(('0', '3')):
            market = 'sz'
        else:
            market = 'bj'
        symbol = f"{market}{code}"
        initials = get_initials(name)
        pinyin_full = get_pinyin_full(name)
        stocks.append({
            "code": code,
            "name": name,
            "market": market,
            "symbol": symbol,
            "initials": initials,
            "pinyin_full": pinyin_full
        })
    _stock_list_cache = stocks
    return stocks

@app.get("/api/search")
def search_stocks(q: str = "", limit: int = 20):
    """
    股票搜索API
    支持：
    - 股票代码搜索 (如 600519, sh600519)
    - 股票名称搜索 (如 茅台)
    - 拼音首字母搜索 (如 MT, gsmt)
    """
    try:
        stocks = _get_stock_list()
        q = (q or "").strip().upper()
        if not q:
            return []
        results = []
        seen = set()

        def add_stock_with_score(stock, score):
            key = stock['code']
            if key in seen:
                return
            stock_with_score = dict(stock)
            stock_with_score['score'] = int(score)
            results.append(stock_with_score)
            seen.add(key)

        # 优先代码精确/前缀匹配
        if q.isdigit():
            for stock in stocks:
                code = stock['code']
                if code == q.zfill(6):
                    add_stock_with_score(stock, 1000)
            if not any(r['code'] == q.zfill(6) for r in results):
                for stock in stocks:
                    if stock['code'].startswith(q):
                        add_stock_with_score(stock, 800)
                        if len(results) >= limit:
                            break

        # 拼音首字母、名称等多维度匹配
        for stock in stocks:
            code = stock['code']
            name = stock['name']
            initials = stock.get('initials', '')
            pfull = stock.get('pinyin_full', '')
            score = 0
            if q in code:
                score += 40
            if q in name.upper():
                score += 60
            if initials.startswith(q):
                score += 50
            elif initials.find(q) != -1:
                score += 20
            if pfull.startswith(q):
                score += 40
            elif q and pfull.find(q) != -1:
                score += 10
            if score > 0:
                add_stock_with_score(stock, score)
            if len(results) >= limit:
                break

        results.sort(key=lambda s: s.get('score', 0), reverse=True)
        return results[:limit]
    except Exception as e:
        logger.error(f"Error searching stocks: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# 注意：流式响应 (/api/analyze-stream) 在 CrewAI 中实现较为复杂，
# 需要自定义 CallbackHandler 并结合 SSE。
# 在本示例中，为保持稳健性，暂主要支持同步接口，
# 若需流式，可后续添加 SSE endpoint 监听内部事件队列。

# 实时买卖分析API
from realtime_trade import get_trade_signal, get_realtime_data

@app.get("/api/trade-signal/{symbol}")
def get_trade_signal_api(symbol: str):
    """
    获取股票实时买卖信号
    返回买入/卖出建议、置信度、关键理由等
    """
    try:
        logger.info(f"Generating trade signal for {symbol}")
        signal = get_trade_signal(symbol)
        return signal
    except Exception as e:
        logger.error(f"Error generating trade signal: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/realtime/{symbol}")
def get_realtime_data_api(symbol: str):
    """
    获取股票实时行情数据
    包括最新价、盘口、分时数据、资金流向等
    """
    try:
        logger.info(f"Fetching realtime data for {symbol}")
        data = get_realtime_data(symbol)
        return data
    except Exception as e:
        logger.error(f"Error fetching realtime data: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

class TradeLogRequest(BaseModel):
    user_id: str
    symbol: str
    action: str
    score: int
    confidence: float
    reasons: list

@app.post("/api/trade-log")
def log_trade_view(request: TradeLogRequest):
    """
    记录用户查看买卖建议的日志（用于合规审计）
    """
    try:
        log_entry = {
            "user_id": request.user_id,
            "symbol": request.symbol,
            "action": request.action,
            "score": request.score,
            "confidence": request.confidence,
            "reasons": request.reasons,
            "timestamp": datetime.datetime.now().isoformat(),
            "ip": "127.0.0.1"
        }
        
        log_dir = os.path.join(os.getcwd(), ".data", "logs")
        os.makedirs(log_dir, exist_ok=True)
        log_path = os.path.join(log_dir, "trade_views.json")
        
        logs = []
        if os.path.exists(log_path):
            try:
                with open(log_path, "r", encoding="utf-8") as f:
                    logs = json.load(f)
            except:
                logs = []
        
        logs.append(log_entry)
        
        with open(log_path, "w", encoding="utf-8") as f:
            json.dump(logs[-1000:], f, ensure_ascii=False, indent=2)
        
        return {"status": "logged", "timestamp": log_entry["timestamp"]}
    except Exception as e:
        logger.error(f"Error logging trade view: {str(e)}")
        return {"status": "error", "detail": str(e)}
