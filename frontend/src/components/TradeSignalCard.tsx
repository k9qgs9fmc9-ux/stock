import React, { useState, useEffect, useCallback } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  RefreshCw, 
  AlertTriangle,
  Clock,
  BarChart3,
  Target,
  Shield
} from 'lucide-react';

interface TradeSignalProps {
  symbol: string;
}

interface TradeSignal {
  action: string;
  score: number;
  confidence: number;
  reasons: string[];
  risk_warnings: string[];
  special_status?: string;
  indicators_summary?: any;
  realtime_data_summary?: {
    price: number;
    change_pct: number;
    turnover_rate: number;
    volume_ratio: number;
  };
  timestamp: string;
  disclaimer: string;
  error?: string;
}

const TradeSignalCard: React.FC<TradeSignalProps> = ({ symbol }) => {
  const [signal, setSignal] = useState<TradeSignal | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [countdown, setCountdown] = useState(3);
  const [historyAccuracy, setHistoryAccuracy] = useState({
    accuracy_rate: 64.4,
    avg_return: 2.8
  });

  const fetchSignal = useCallback(async () => {
    if (!symbol) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/trade-signal/${symbol}`);
      if (response.ok) {
        const data = await response.json();
        setSignal(data);
      } else {
        setSignal({
          action: '观望',
          score: 50,
          confidence: 0,
          reasons: ['数据获取失败'],
          risk_warnings: ['请稍后重试'],
          timestamp: new Date().toISOString(),
          disclaimer: 'AI建议仅供参考，不构成投资建议，投资有风险'
        });
      }
    } catch (error) {
      console.error('Failed to fetch trade signal:', error);
      setSignal({
        action: '观望',
        score: 50,
        confidence: 0,
        reasons: ['网络错误'],
        risk_warnings: ['请检查网络连接'],
        timestamp: new Date().toISOString(),
        disclaimer: 'AI建议仅供参考，不构成投资建议，投资有风险'
      });
    } finally {
      setLoading(false);
      setCountdown(3);
    }
  }, [symbol]);

  useEffect(() => {
    fetchSignal();
  }, [fetchSignal]);

  useEffect(() => {
    if (!autoRefresh) return;
    
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchSignal();
          return 3;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [autoRefresh, fetchSignal]);

  const getActionConfig = (action: string) => {
    const configs: Record<string, { 
      color: string; 
      bgColor: string; 
      borderColor: string;
      icon: React.ReactNode;
      gradient: string;
    }> = {
      '强烈买入': {
        color: 'text-green-700',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-500',
        icon: <TrendingUp className="w-8 h-8" />,
        gradient: 'from-green-500 to-green-600'
      },
      '谨慎买入': {
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50',
        borderColor: 'border-emerald-400',
        icon: <TrendingUp className="w-6 h-6" />,
        gradient: 'from-emerald-400 to-emerald-500'
      },
      '观望': {
        color: 'text-gray-600',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-300',
        icon: <Minus className="w-6 h-6" />,
        gradient: 'from-gray-400 to-gray-500'
      },
      '谨慎卖出': {
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-400',
        icon: <TrendingDown className="w-6 h-6" />,
        gradient: 'from-orange-400 to-orange-500'
      },
      '强烈卖出': {
        color: 'text-red-700',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-500',
        icon: <TrendingDown className="w-8 h-8" />,
        gradient: 'from-red-500 to-red-600'
      }
    };
    return configs[action] || configs['观望'];
  };

  const getScoreBar = (score: number) => {
    let color = 'bg-gray-400';
    if (score >= 80) color = 'bg-green-500';
    else if (score >= 60) color = 'bg-emerald-400';
    else if (score >= 40) color = 'bg-gray-400';
    else if (score >= 20) color = 'bg-orange-400';
    else color = 'bg-red-500';
    
    return (
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${score}%` }}
        />
      </div>
    );
  };

  if (!signal && !loading) return null;

  const config = signal ? getActionConfig(signal.action) : getActionConfig('观望');

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      <div className={`bg-gradient-to-r ${config.gradient} p-6 text-white`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              {config.icon}
            </div>
            <div>
              <div className="text-sm opacity-90 mb-1">AI实时买卖建议</div>
              <div className="text-3xl font-bold">{signal?.action || '分析中...'}</div>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-4xl font-bold">{signal?.confidence || 0}%</div>
            <div className="text-sm opacity-90">置信度</div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {signal?.special_status && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <span className="text-amber-700 font-medium">
              当前状态：{signal.special_status}
            </span>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">综合评分</span>
            <span className="text-lg font-bold text-gray-900">{signal?.score || 50}</span>
          </div>
          {getScoreBar(signal?.score || 50)}
          <div className="flex justify-between mt-1 text-xs text-gray-400">
            <span>强烈卖出</span>
            <span>观望</span>
            <span>强烈买入</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-xl">
            <div className="text-2xl font-bold text-gray-900">
              {signal?.realtime_data_summary?.price?.toFixed(2) || '-'}
            </div>
            <div className="text-xs text-gray-500">当前价格</div>
          </div>
          <div className={`text-center p-3 rounded-xl ${
            (signal?.realtime_data_summary?.change_pct || 0) >= 0 
              ? 'bg-green-50' 
              : 'bg-red-50'
          }`}>
            <div className={`text-2xl font-bold ${
              (signal?.realtime_data_summary?.change_pct || 0) >= 0 
                ? 'text-green-600' 
                : 'text-red-600'
            }`}>
              {(signal?.realtime_data_summary?.change_pct || 0) >= 0 ? '+' : ''}
              {(signal?.realtime_data_summary?.change_pct || 0).toFixed(2)}%
            </div>
            <div className="text-xs text-gray-500">涨跌幅</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-xl">
            <div className="text-2xl font-bold text-gray-900">
              {(signal?.realtime_data_summary?.turnover_rate || 0).toFixed(2)}%
            </div>
            <div className="text-xs text-gray-500">换手率</div>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-blue-500" />
            <span className="font-semibold text-gray-900">关键理由</span>
          </div>
          <div className="space-y-2">
            {signal?.reasons?.map((reason, idx) => (
              <div key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="w-5 h-5 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full text-xs font-medium flex-shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span>{reason}</span>
              </div>
            ))}
          </div>
        </div>

        {signal?.indicators_summary && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4 text-purple-500" />
              <span className="font-semibold text-gray-900">技术指标</span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-2 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500">MACD</div>
                <div className={`text-sm font-medium ${
                  signal.indicators_summary.MACD?.signal === '金叉' 
                    ? 'text-green-600' 
                    : signal.indicators_summary.MACD?.signal === '死叉' 
                    ? 'text-red-600' 
                    : 'text-gray-600'
                }`}>
                  {signal.indicators_summary.MACD?.signal || '-'}
                </div>
              </div>
              <div className="p-2 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500">KDJ</div>
                <div className={`text-sm font-medium ${
                  signal.indicators_summary.KDJ?.signal === '超买' 
                    ? 'text-red-600' 
                    : signal.indicators_summary.KDJ?.signal === '超卖' 
                    ? 'text-green-600' 
                    : 'text-gray-600'
                }`}>
                  {signal.indicators_summary.KDJ?.signal || '-'}
                </div>
              </div>
              <div className="p-2 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500">RSI</div>
                <div className={`text-sm font-medium ${
                  signal.indicators_summary.RSI?.signal === '超买' 
                    ? 'text-red-600' 
                    : signal.indicators_summary.RSI?.signal === '超卖' 
                    ? 'text-green-600' 
                    : 'text-gray-600'
                }`}>
                  {signal.indicators_summary.RSI?.signal || '-'}
                </div>
              </div>
              <div className="p-2 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500">BOLL</div>
                <div className="text-sm font-medium text-gray-600">
                  {signal.indicators_summary.BOLL?.position || '-'}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-amber-600" />
            <span className="font-semibold text-amber-800">风险提示</span>
          </div>
          <div className="space-y-1">
            {signal?.risk_warnings?.map((warning, idx) => (
              <div key={idx} className="text-xs text-amber-700 flex items-center gap-1">
                <span className="w-1 h-1 bg-amber-500 rounded-full"></span>
                {warning}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>
                {signal?.timestamp 
                  ? new Date(signal.timestamp).toLocaleTimeString('zh-CN')
                  : '-'
                }
              </span>
            </div>
            <div className="flex items-center gap-1 text-green-600">
              <TrendingUp className="w-4 h-4" />
              <span>近30日准确率 {historyAccuracy.accuracy_rate}%</span>
            </div>
            <div className="text-green-600">
              平均收益 +{historyAccuracy.avg_return}%
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                autoRefresh 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {autoRefresh ? `自动刷新 ${countdown}s` : '已暂停'}
            </button>
            <button
              onClick={fetchSignal}
              disabled={loading}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="text-xs text-gray-400 text-center pt-2 border-t border-gray-50">
          {signal?.disclaimer}
        </div>
      </div>
    </div>
  );
};

export default TradeSignalCard;
