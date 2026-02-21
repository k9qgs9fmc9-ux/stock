import akshare as ak
import pandas as pd

try:
    print("Testing AKShare...")
    symbol = "600519"
    df = ak.stock_zh_a_hist(symbol=symbol, period="daily", start_date="20240101", adjust="qfq")
    if not df.empty:
        print(f"Successfully fetched {len(df)} rows.")
        print(df.head(1))
    else:
        print("Fetched empty dataframe.")
except Exception as e:
    print(f"AKShare Error: {e}")
