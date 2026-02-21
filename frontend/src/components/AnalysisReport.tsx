import React, { useState } from 'react';
import clsx from 'clsx';
import ReactMarkdown from 'react-markdown';

interface AnalysisReportProps {
  report: string;
  loading: boolean;
  onCancel?: () => void;
}

const AnalysisReport: React.FC<AnalysisReportProps> = ({ report, loading, onCancel }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'fundamental' | 'technical' | 'advice'>('all');

  if (loading) {
    return (
      <div className="w-full h-64 flex flex-col items-center justify-center bg-white rounded-lg border border-gray-200 p-8">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-100 border-t-blue-600 mb-4"></div>
        <p className="text-gray-500 font-medium">AI Agents 正在协同分析中...</p>
        <div className="mt-4 space-y-2 text-sm text-gray-400">
          <p className="animate-pulse">🔍 市场研究员正在收集数据...</p>
          <p className="animate-pulse delay-75">📊 基本面分析师正在评估估值...</p>
          <p className="animate-pulse delay-150">📈 技术分析师正在绘制趋势...</p>
          <p className="animate-pulse delay-300">💡 首席顾问正在生成最终建议...</p>
        </div>
        {onCancel && (
            <button 
                onClick={onCancel}
                className="mt-6 px-4 py-2 bg-white border border-red-200 text-red-600 rounded-full text-sm hover:bg-red-50 transition-colors flex items-center gap-2"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                取消分析
            </button>
        )}
      </div>
    );
  }

  if (!report) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="border-b border-gray-200 bg-gray-50 px-4">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {['all'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={clsx(
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize'
              )}
            >
              全部分析报告
            </button>
          ))}
        </nav>
      </div>
      <div className="p-6 prose max-w-none">
        <ReactMarkdown>{report}</ReactMarkdown>
      </div>
    </div>
  );
};

export default AnalysisReport;
