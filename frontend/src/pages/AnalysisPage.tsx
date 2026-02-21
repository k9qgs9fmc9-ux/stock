import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import SearchBar from '../components/SearchBar';
import KLineChart from '../components/KLineChart';
import AnalysisReport from '../components/AnalysisReport';
import TradeSignalCard from '../components/TradeSignalCard';
import { analyzeStock } from '../services/api';
import { ArrowLeft, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import axios from 'axios';

const AnalysisPage: React.FC = () => {
  const { symbol } = useParams<{ symbol: string }>();
  const [report, setReport] = useState<string>('');
  const [reports, setReports] = useState<{ direct?: string; agent?: string }>({});
  const [loading, setLoading] = useState(false);
  const [stockName, setStockName] = useState<string>('');
  const [analysisMode, setAnalysisMode] = useState<'direct' | 'agent' | 'mixed'>('direct');
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (symbol) {
      handleAnalyze(symbol, analysisMode);
    }
  }, [symbol]); // Removed analysisMode from dependency to prevent auto-re-fetch on mode switch without user intent, or we can add it if we want instant switch

  const handleAnalyze = async (code: string, mode: 'direct' | 'agent' | 'mixed') => {
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setReport('');
    setReports({});
    try {
      const result = await analyzeStock(code, mode, controller.signal);
      if (result.name) {
          setStockName(result.name);
      }
      
      // Update state based on returned data
      if (result.reports) {
          setReports(result.reports);
          // Set primary report for legacy view
          setReport(result.reports.direct || result.reports.agent || result.report);
      } else {
          setReport(result.report);
      }
      
    } catch (error) {
      if (axios.isCancel(error)) {
          console.log('Request canceled');
          setReport('分析已主动取消。');
      } else {
          console.error("Analysis failed", error);
          setReport("分析请求失败，请稍后重试。");
      }
    } finally {
      if (abortControllerRef.current === controller) {
        setLoading(false);
        abortControllerRef.current = null;
      }
    }
  };

  const handleCancel = () => {
      if (abortControllerRef.current) {
          abortControllerRef.current.abort();
      }
  };

  const handleModeChange = (mode: 'direct' | 'agent' | 'mixed') => {
      setAnalysisMode(mode);
      if (symbol) {
          handleAnalyze(symbol, mode);
      }
  };

  if (!symbol) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/" className="text-gray-500 hover:text-gray-700 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </a>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              {stockName || symbol} 
              <span className="text-sm font-normal text-gray-500">
                {stockName ? `(${symbol})` : '分析报告'}
              </span>
            </h1>
          </div>
          
          {/* Mode Switcher */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button 
                onClick={() => handleModeChange('direct')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${analysisMode === 'direct' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
                快速直连
            </button>
            <button 
                onClick={() => handleModeChange('agent')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${analysisMode === 'agent' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
                深度Agent
            </button>
            <button 
                onClick={() => handleModeChange('mixed')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${analysisMode === 'mixed' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
                混合策略
            </button>
          </div>

          <div className="w-64 hidden md:block">
            <SearchBar initialValue={symbol} onSearch={(val) => window.location.href = `/analysis/${val}`} />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
        {/* Real-time Trade Signal Section */}
        <section>
          <TradeSignalCard symbol={symbol} />
        </section>

        {/* Chart Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">市场行情</h2>
            <div className="flex gap-2">
              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">日K</span>
              <span className="px-2 py-1 text-xs bg-white text-gray-400 rounded">周K</span>
            </div>
          </div>
          <KLineChart 
            symbol={symbol} 
            onStockInfoLoaded={(name) => setStockName(name)}
          />
        </section>

        {/* Report Section */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">AI 深度分析</h2>
          
          {analysisMode === 'mixed' && !loading && reports.direct && reports.agent ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                      <h3 className="text-md font-medium text-blue-600 mb-2 flex items-center">
                          <span className="w-2 h-2 bg-blue-600 rounded-full mr-2"></span>
                          直连模式 (事实快照)
                      </h3>
                      <AnalysisReport report={reports.direct} loading={false} />
                  </div>
                  <div>
                      <h3 className="text-md font-medium text-purple-600 mb-2 flex items-center">
                          <span className="w-2 h-2 bg-purple-600 rounded-full mr-2"></span>
                          Agent模式 (深度研判)
                      </h3>
                      <AnalysisReport report={reports.agent} loading={false} />
                  </div>
              </div>
          ) : (
              <AnalysisReport 
                report={report} 
                loading={loading} 
                onCancel={handleCancel} // Pass cancellation handler
              />
          )}
        </section>
      </main>
    </div>
  );
};

export default AnalysisPage;
