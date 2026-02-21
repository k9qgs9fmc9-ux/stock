import axios from 'axios';
import { AnalysisResult, KLineResponse } from '../types';

const API_BASE_URL = 'http://localhost:8006/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // 增加超时时间到 5 分钟，因为多 Agent 协同分析非常耗时
});

export const fetchHotStocks = async (): Promise<{ boards: any[], stocks: any[] }> => {
  const response = await api.get('/hot');
  return response.data;
};

export const analyzeStock = async (symbol: string, mode: 'direct' | 'agent' | 'mixed' = 'direct', signal?: AbortSignal): Promise<AnalysisResult> => {
  const response = await api.post<AnalysisResult>('/analyze', { symbol, mode }, { signal });
  return response.data;
};

export const fetchKLineData = async (symbol: string, period: string = 'daily', adjust: string = 'qfq'): Promise<KLineResponse> => {
  const response = await api.get<KLineResponse>(`/kline`, {
    params: { symbol, period, adjust }
  });
  return response.data;
};

export const fetchRecommendedStocks = async (): Promise<any[]> => {
  const response = await api.get('/recommend');
  return response.data;
};
