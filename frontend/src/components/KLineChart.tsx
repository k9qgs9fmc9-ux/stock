import React, { useEffect, useRef, useState } from 'react';
import { init, dispose, Chart, LineType } from 'klinecharts';
import { fetchKLineData } from '../services/api';

interface KLineChartProps {
  symbol: string;
  theme?: 'light' | 'dark';
  onStockInfoLoaded?: (name: string) => void;
}

const periods = [
  { label: '分时', value: '1' },
  { label: '5分', value: '5' },
  { label: '15分', value: '15' },
  { label: '30分', value: '30' },
  { label: '60分', value: '60' },
  { label: '日K', value: 'daily' },
  { label: '周K', value: 'weekly' },
  { label: '月K', value: 'monthly' },
];

const adjusts = [
  { label: '不复权', value: '' },
  { label: '前复权', value: 'qfq' },
  { label: '后复权', value: 'hfq' },
];

const indicators = ['MA', 'VOL', 'MACD', 'KDJ', 'RSI', 'BOLL'];

const KLineChart: React.FC<KLineChartProps> = ({ symbol, theme = 'dark', onStockInfoLoaded }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState('daily');
  const [adjust, setAdjust] = useState('qfq');
  const [mainIndicator, setMainIndicator] = useState('MA');
  const [subIndicator, setSubIndicator] = useState('VOL');

  // Tonghuashun-like Theme Configuration
  // User Requested: Red=Up, Green=Down (Chinese style)
  const thsTheme = {
    grid: {
      horizontal: { color: '#333333', style: 'dashed' as LineType, dashedValue: [2, 2] },
      vertical: { color: '#333333', style: 'dashed' as LineType, dashedValue: [2, 2] }
    },
    candle: {
      bar: {
        upColor: '#FF0000', // Red for Up
        downColor: '#00FF00', // Green for Down
        noChangeColor: '#888888',
        upBorderColor: '#FF0000',
        downBorderColor: '#00FF00',
        noChangeBorderColor: '#888888',
        upWickColor: '#FF0000',
        downWickColor: '#00FF00',
        noChangeWickColor: '#888888'
      },
      priceMark: {
        last: {
          upColor: '#FF0000',
          downColor: '#00FF00',
          noChangeColor: '#888888',
          line: { show: true, style: 'dashed' as LineType, dashedValue: [4, 4], color: '#FFFF00' }, // Blinking yellow line simulated by dashed yellow
          text: { show: true, color: '#FFFFFF', backgroundColor: '#333333', padding: 4 }
        }
      },
      tooltip: {
        showRule: 'always',
        showType: 'rect',
        custom: null,
        defaultValue: 'n/a',
        rect: {
          paddingLeft: 0,
          paddingRight: 0,
          paddingTop: 0,
          paddingBottom: 6,
          offsetLeft: 8,
          offsetTop: 8,
          offsetRight: 8,
          borderRadius: 4,
          borderSize: 1,
          borderColor: '#3f4254',
          color: 'rgba(17, 17, 17, 0.8)'
        },
        text: {
          size: 12,
          family: 'Microsoft YaHei',
          color: '#D9D9D9',
          marginLeft: 8,
          marginTop: 6,
          marginRight: 8,
          marginBottom: 0
        },
        icons: []
      }
    },
    technicalIndicator: {
      bar: {
        upColor: 'rgba(255, 0, 0, 0.7)',
        downColor: 'rgba(0, 255, 0, 0.7)',
        noChangeColor: '#888888'
      },
      line: {
        size: 1,
        colors: ['#FF9600', '#9D258C', '#2196F3', '#FF0000', '#00FF00']
      },
      circle: {
        upColor: '#FF0000',
        downColor: '#00FF00',
        noChangeColor: '#888888'
      }
    },
    xAxis: {
      axisLine: { color: '#333333' },
      tickText: { color: '#D9D9D9', family: 'Microsoft YaHei', size: 12 },
      tickLine: { color: '#333333' }
    },
    yAxis: {
      axisLine: { color: '#333333' },
      tickText: { color: '#D9D9D9', family: 'Microsoft YaHei', size: 12 },
      tickLine: { color: '#333333' }
    },
    crosshair: {
      horizontal: { style: 'dashed' as LineType, dashedValue: [4, 4], color: '#FFFF00', text: { color: '#000000', backgroundColor: '#FFFF00' } },
      vertical: { style: 'dashed' as LineType, dashedValue: [4, 4], color: '#FFFF00', text: { color: '#000000', backgroundColor: '#FFFF00' } }
    },
    separator: { color: '#333333' }
  };

  useEffect(() => {
    if (chartContainerRef.current) {
      chartRef.current = init(chartContainerRef.current);
      // Force dark theme background as requested
      chartRef.current?.setStyles(thsTheme as any);
      // chartRef.current?.setStyles({ background: { color: '#000000' } }); // background might not be directly in setStyles root in some versions, but usually it is? 
      // Actually, klinecharts v9 uses setStyles with DeepPartial<Styles>.
      // Let's assume background color is handled by CSS (bg-black) or try setting it via theme.
      // If Typescript complains about background, I will just omit it here and rely on CSS or use 'as any'.
      // I'll use 'as any' for the whole object to be safe.
      
      // Create Indicators
      chartRef.current?.createIndicator('MA', false, { id: 'candle_pane' });
      chartRef.current?.createIndicator('VOL', false, { id: 'vol_pane' }); // Default Sub
    }
    return () => {
      dispose(chartContainerRef.current!);
    };
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const response = await fetchKLineData(symbol, period, adjust);
        if (response.name && onStockInfoLoaded) {
            onStockInfoLoaded(response.name);
        }
        chartRef.current?.applyNewData(response.data);
      } catch (error) {
        console.error("Failed to load chart data", error);
      } finally {
        setLoading(false);
      }
    };

    if (symbol) {
      loadData();
    }
  }, [symbol, period, adjust, onStockInfoLoaded]);

  // Indicator Switching
  const handleMainIndicatorChange = (ind: string) => {
      setMainIndicator(ind);
      chartRef.current?.createIndicator(ind, true, { id: 'candle_pane' });
  };

  const handleSubIndicatorChange = (ind: string) => {
      setSubIndicator(ind);
      // Remove old sub indicators from bottom pane if any
      // Usually pane 1 is volume or sub. Let's manage sub panes.
      // Simple logic: Clear pane 1 and add new
      // But KLineCharts API is add/remove.
      // Let's simplified: Create indicator in a new pane or reuse pane.
      // Default: candle_pane is main. We need a sub pane.
      // By default createIndicator with paneId creates it there.
      // If we want to switch, we override.
      // Actually klinecharts manages panes automatically if we don't specify or specify new.
      // Let's assume a single sub-pane for simplicity + VOL always there?
      // User requirement: VOL at bottom, others in new area.
      // So Pane 0: Candle + MA
      // Pane 1: VOL
      // Pane 2: MACD/KDJ
      
      // Ensure VOL is always present? Or switchable?
      // "成交量图：底部副图... MACD/KDJ等指标：新增副图区域" -> So VOL + One more Sub.
      
      // Check if VOL pane exists
      // This library is imperative. Let's just override the "sub_pane"
      chartRef.current?.createIndicator(ind, false, { id: 'sub_pane' });
  };

  return (
    <div className="flex flex-col bg-black rounded-lg border border-[#333333] overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2 border-b border-[#333333] bg-[#111111]">
        {/* Period */}
        <div className="flex gap-1 overflow-x-auto no-scrollbar">
          {periods.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-2 py-1 text-xs rounded transition-colors whitespace-nowrap ${period === p.value ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
        
        {/* Adjust */}
        <div className="flex gap-1 ml-4 border-l border-[#333333] pl-4">
           {adjusts.map((a) => (
            <button
              key={a.value}
              onClick={() => setAdjust(a.value)}
              className={`px-2 py-1 text-xs rounded transition-colors whitespace-nowrap ${adjust === a.value ? 'text-yellow-400' : 'text-gray-400 hover:text-white'}`}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Area */}
      <div className="relative h-[500px] w-full">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}
        <div ref={chartContainerRef} className="h-full w-full" />
      </div>

      {/* Indicator Bar */}
      <div className="flex gap-4 px-4 py-2 border-t border-[#333333] bg-[#111111] overflow-x-auto">
         <div className="flex gap-2 items-center">
            <span className="text-xs text-gray-500">主图:</span>
            {['MA', 'BOLL'].map(ind => (
                <button
                    key={ind}
                    onClick={() => handleMainIndicatorChange(ind)}
                    className={`text-xs ${mainIndicator === ind ? 'text-blue-400' : 'text-gray-400'}`}
                >
                    {ind}
                </button>
            ))}
         </div>
         <div className="flex gap-2 items-center border-l border-[#333333] pl-4">
            <span className="text-xs text-gray-500">副图:</span>
            {['VOL', 'MACD', 'KDJ', 'RSI'].map(ind => (
                <button
                    key={ind}
                    onClick={() => handleSubIndicatorChange(ind)}
                    className={`text-xs ${subIndicator === ind ? 'text-purple-400' : 'text-gray-400'}`}
                >
                    {ind}
                </button>
            ))}
         </div>
      </div>
    </div>
  );
};

export default KLineChart;
