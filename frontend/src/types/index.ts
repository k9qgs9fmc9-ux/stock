export interface StockData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  turnover?: number;
}

export interface KLineResponse {
  name: string;
  symbol: string;
  data: StockData[];
}

export interface AnalysisResult {
  symbol: string;
  name?: string;
  report: string; // Legacy field for backward compatibility
  reports?: {
    direct?: string;
    agent?: string;
  };
}
