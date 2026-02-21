import React, { useEffect, useState } from 'react';
import SearchBar from '../components/SearchBar';
import { TrendingUp, BarChart2, Zap, Flame, ArrowUpRight, ArrowDownRight, Award, ChevronRight } from 'lucide-react';
import { fetchHotStocks, fetchRecommendedStocks } from '../services/api';

const HomePage: React.FC = () => {
  const [hotData, setHotData] = useState<{ boards: any[], stocks: any[] }>({ boards: [], stocks: [] });
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [recLoading, setRecLoading] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [asof, setAsof] = useState<string | undefined>(undefined);
  const fallbackSymbol = 'sh600519';
  const encodeCnCode = (code: string) => {
    if (/^\d+$/.test(code)) {
      if (code.startsWith('6')) return 'sh' + code;
      if (code.startsWith('0') || code.startsWith('3')) return 'sz' + code;
      if (code.startsWith('4') || code.startsWith('8')) return 'bj' + code;
    }
    return code;
  };

  useEffect(() => {
    const loadHot = async () => {
        setLoading(true);
        try {
            const data = await fetchHotStocks();
            setHotData(data);
            const info = data as any;
            setFallback(!!info.fallback);
            setAsof(info.asof);
        } catch (e) {
            setFallback(false);
            setAsof(undefined);
        } finally {
            setLoading(false);
        }
    };
    
    const loadRecs = async () => {
        setRecLoading(true);
        try {
            const recs = await fetchRecommendedStocks();
            setRecommendations(recs);
        } catch (e) {
            console.error("Failed recs", e);
        } finally {
            setRecLoading(false);
        }
    };

    loadHot();
    loadRecs();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-5xl text-center space-y-12">
        {/* Hero Section */}
        <div className="space-y-4">
          <div className="flex justify-center mb-6">
            <div className="bg-blue-600 p-3 rounded-2xl shadow-lg">
              <TrendingUp className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">
            AI 全栈股票分析助手
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            基于多 Agent 协同系统，为您提供深度的基本面、技术面分析与投资建议。
          </p>
        </div>

        {/* Search Section */}
        <div className="relative z-50 bg-white p-8 rounded-2xl shadow-xl border border-gray-100 max-w-2xl mx-auto">
          <SearchBar onSearch={(val) => { window.location.href = `/analysis/${val}`; }} />
        </div>

        {/* Recommended Section (New) */}
        {recLoading || recommendations.length > 0 ? (
          <div className="max-w-4xl mx-auto">
             <div className="flex items-center gap-2 mb-4 justify-center">
                <Award className="w-6 h-6 text-purple-600" />
                <h3 className="text-xl font-bold text-gray-900">量化甄选 · 潜力金股</h3>
             </div>
             {recLoading ? (
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1,2,3].map(i => <div key={i} className="h-32 bg-white rounded-xl shadow-sm animate-pulse border border-gray-100"></div>)}
                 </div>
             ) : (
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {recommendations.map((stock, idx) => (
                        <div 
                            key={idx}
                            className="bg-white p-5 rounded-xl shadow-md border border-purple-100 hover:shadow-lg transition-all cursor-pointer relative overflow-hidden group text-left"
                            onClick={() => {
                                let code = String(stock.code);
                                code = encodeCnCode(code);
                                window.location.href = `/analysis/${code}`;
                            }}
                        >
                            <div className="absolute top-0 right-0 bg-purple-600 text-white text-xs px-2 py-1 rounded-bl-lg font-bold">
                                强力推荐
                            </div>
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h4 className="text-lg font-bold text-gray-900 group-hover:text-purple-600 transition-colors">{stock.name}</h4>
                                    <span className="text-xs text-gray-500 font-mono">{stock.code}</span>
                                </div>
                                <span className="text-lg font-semibold text-red-500">¥{stock.price}</span>
                            </div>
                            <p className="text-xs text-gray-600 mb-3 line-clamp-2 h-8">
                                {stock.reason}
                            </p>
                            <div className="flex justify-between items-center text-xs text-gray-500 border-t border-gray-100 pt-3">
                                <span>支撑: <span className="text-gray-900">{stock.support}</span></span>
                                <span>阻力: <span className="text-gray-900">{stock.resistance}</span></span>
                            </div>
                            <div className="mt-3 flex items-center justify-end text-purple-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                立即分析 <ChevronRight className="w-4 h-4" />
                            </div>
                        </div>
                    ))}
                 </div>
             )}
          </div>
        ) : null}

        {/* Hot Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full text-left">
            {/* Hot Boards */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                    <Flame className="w-5 h-5 text-red-500" />
                    <h3
                      className="text-lg font-bold text-gray-900 cursor-pointer hover:text-blue-600"
                      onClick={() => {
                        if (hotData.boards.length > 0) {
                          const leader = hotData.boards[0]?.['领涨股票'] || '';
                          const match = leader.match(/\d+/);
                          if (match) {
                            const prefix = match[0].startsWith('6') ? 'sh' : 'sz';
                            window.location.href = `/analysis/${prefix}${match[0]}`;
                            return;
                          }
                        }
                        window.location.href = `/analysis/${fallbackSymbol}`;
                      }}
                    >
                      热门行业板块
                    </h3>
                    {fallback && (
                      <span className="ml-2 px-2 py-0.5 text-xs rounded bg-amber-100 text-amber-700">
                        使用最近交易日{asof ? `（${asof}）` : ''}
                      </span>
                    )}
                </div>
                {loading ? (
                    <div className="space-y-3">
                        {[1,2,3].map(i => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse"></div>)}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {hotData.boards.map((board: any, idx) => (
                            <div 
                                key={idx} 
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer group"
                                onClick={() => {
                                    const match = board['领涨股票']?.match(/\d+/);
                                    if (match) {
                                        const code = match[0];
                                        const prefix = code.startsWith('6') ? 'sh' : 'sz';
                                        window.location.href = `/analysis/${prefix}${code}`;
                                    }
                                }}
                            >
                                <div>
                                    <span className="font-medium text-gray-800 group-hover:text-blue-600 transition-colors">{board['板块名称']}</span>
                                    <span className="text-xs text-gray-500 ml-2">领涨: {board['领涨股票']}</span>
                                </div>
                                <div className="flex items-center text-red-500 font-semibold">
                                    <ArrowUpRight className="w-4 h-4 mr-1" />
                                    {board['涨跌幅']}%
                                </div>
                            </div>
                        ))}
                        {!loading && hotData.boards.length === 0 && (
                          <div
                            className="text-sm text-blue-600 cursor-pointer"
                            onClick={() => (window.location.href = `/analysis/${fallbackSymbol}`)}
                          >
                            暂无数据，点击查看示例分析
                          </div>
                        )}
                    </div>
                )}
            </div>

            {/* Hot Stocks */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-5 h-5 text-amber-500" />
                    <h3
                      className="text-lg font-bold text-gray-900 cursor-pointer hover:text-blue-600"
                      onClick={() => {
                        if (hotData.stocks.length > 0) {
                          const first = String(hotData.stocks[0]?.['代码'] || '');
                          const code = encodeCnCode(first);
                          window.location.href = `/analysis/${code}`;
                          return;
                        }
                        window.location.href = `/analysis/${fallbackSymbol}`;
                      }}
                    >
                      个股人气榜
                    </h3>
                    {fallback && (
                      <span className="ml-2 px-2 py-0.5 text-xs rounded bg-amber-100 text-amber-700">
                        使用最近交易日{asof ? `（${asof}）` : ''}
                      </span>
                    )}
                </div>
                {loading ? (
                    <div className="space-y-3">
                        {[1,2,3].map(i => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse"></div>)}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {hotData.stocks.map((stock: any, idx) => (
                            <div 
                                key={idx} 
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer group"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation(); // Stop bubbling
                                    let code = String(stock['代码']); 
                                    if (/^\d+$/.test(code)) {
                                        if (code.startsWith('6')) code = 'sh' + code;
                                        else if (code.startsWith('0') || code.startsWith('3')) code = 'sz' + code;
                                        else if (code.startsWith('4') || code.startsWith('8')) code = 'bj' + code;
                                    }
                                    window.location.href = `/analysis/${code}`; // Force redirect
                                }}
                            >
                                <div>
                                    <span className="font-medium text-gray-800 group-hover:text-blue-600 transition-colors">{stock['名称']}</span>
                                    <span className="text-xs text-gray-400 ml-2">{stock['代码']}</span>
                                </div>
                                <div className={`flex items-center font-semibold ${stock['涨跌幅'] >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                                    {stock['涨跌幅'] >= 0 ? <ArrowUpRight className="w-4 h-4 mr-1" /> : <ArrowDownRight className="w-4 h-4 mr-1" />}
                                    {stock['涨跌幅']}%
                                </div>
                            </div>
                        ))}
                        {!loading && hotData.stocks.length === 0 && (
                          <div
                            className="text-sm text-blue-600 cursor-pointer"
                            onClick={() => (window.location.href = `/analysis/${fallbackSymbol}`)}
                          >
                            暂无数据，点击查看示例分析
                          </div>
                        )}
                    </div>
                )}
            </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <BarChart2 className="w-8 h-8 text-blue-500 mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">深度数据挖掘</h3>
            <p className="text-gray-600 text-sm">自动采集并清洗全网财务数据、新闻舆情与历史行情。</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <Zap className="w-8 h-8 text-amber-500 mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">多维技术分析</h3>
            <p className="text-gray-600 text-sm">集成 MA, MACD, KDJ 等经典指标，自动识别形态与趋势。</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <TrendingUp className="w-8 h-8 text-emerald-500 mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">智能投资顾问</h3>
            <p className="text-gray-600 text-sm">综合基本面与技术面，生成专业的买卖评级与目标价位。</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
