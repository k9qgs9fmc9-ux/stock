import akshare as ak
import pandas as pd

try:
    symbol = "600839"
    print(f"Fetching info for {symbol}...")
    
    # Try stock_individual_info_em
    info = ak.stock_individual_info_em(symbol=symbol)
    print("Stock Info:")
    print(info)
    
    # Check what's in it
    # Usually it has 'item' and 'value' columns
    # We look for '股票简称'
    
except Exception as e:
    print(f"Error: {e}")
