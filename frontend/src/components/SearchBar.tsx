import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Clock, X, TrendingUp, Loader2 } from 'lucide-react';

interface StockResult {
  code: string;
  name: string;
  market: string;
  symbol: string;
  initials?: string;
  pinyin_full?: string;
  score?: number;
}

interface SearchBarProps {
  initialValue?: string;
  onSearch?: (value: string) => void;
}

// 获取市场标签和颜色
const getMarketInfo = (market: string) => {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    sh: { label: '沪', color: 'text-red-600', bg: 'bg-red-50' },
    sz: { label: '深', color: 'text-blue-600', bg: 'bg-blue-50' },
    bj: { label: '京', color: 'text-orange-600', bg: 'bg-orange-50' },
  };
  return map[market] || { label: market.toUpperCase(), color: 'text-gray-600', bg: 'bg-gray-50' };
};

// 高亮匹配文本
const HighlightText: React.FC<{ text: string; query: string; className?: string }> = ({ 
  text, 
  query, 
  className = '' 
}) => {
  if (!query || !text) return <span className={className}>{text}</span>;
  
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);
  
  return (
    <span className={className}>
      {parts.map((part, i) => 
        regex.test(part) ? (
          <span key={i} className="text-blue-600 font-bold bg-blue-100 px-0.5 rounded">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
};

const SearchBar: React.FC<SearchBarProps> = ({ initialValue = '', onSearch }) => {
  const [query, setQuery] = useState(initialValue);
  const [history, setHistory] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<StockResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const saved = localStorage.getItem('searchHistory');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch {
        setHistory([]);
      }
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.trim().length > 0) {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        searchStocks(query);
      }, 200);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  const searchStocks = async (q: string) => {
    if (!q.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=10`);
      if (response.ok) {
        const data = await response.json();
        const mapped = data.map((s: any) => ({
          code: s.code,
          name: s.name,
          market: s.market,
          symbol: s.symbol,
          initials: s.initials || s.pinyin,
          pinyin_full: s.pinyin_full,
          score: s.score ?? 0
        }));
        setSuggestions(mapped);
        setShowSuggestions(mapped.length > 0);
        setSelectedIndex(-1);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent, searchValue?: string) => {
    e.preventDefault();
    const code = (searchValue || query).trim();
    if (!code) return;

    setShowSuggestions(false);
    
    const newHistory = [code, ...history.filter(h => h !== code)].slice(0, 5);
    setHistory(newHistory);
    localStorage.setItem('searchHistory', JSON.stringify(newHistory));

    if (onSearch) {
      onSearch(code);
    } else {
      navigate(`/analysis/${code}`);
    }
  };

  const handleSelectStock = (stock: StockResult) => {
    setQuery(stock.symbol);
    setShowSuggestions(false);
    handleSearch(new Event('submit') as unknown as React.FormEvent, stock.symbol);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        e.preventDefault();
        handleSelectStock(suggestions[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      inputRef.current?.blur();
    }
  };

  // 分组显示建议
  const groupedSuggestions = useMemo(() => {
    const groups: { title: string; items: StockResult[] }[] = [];
    
    // 代码匹配
    const codeMatches = suggestions.filter(s => s.code.includes(query.toUpperCase()));
    if (codeMatches.length > 0) {
      groups.push({ title: '代码匹配', items: codeMatches.slice(0, 3) });
    }
    
    // 名称匹配
    const nameMatches = suggestions.filter(s => 
      s.name.toUpperCase().includes(query.toUpperCase()) && !codeMatches.includes(s)
    );
    if (nameMatches.length > 0) {
      groups.push({ title: '名称匹配', items: nameMatches.slice(0, 3) });
    }
    
    // 首字母匹配
    const initialMatches = suggestions.filter(s => 
      s.initials?.toUpperCase().includes(query.toUpperCase()) && 
      !codeMatches.includes(s) && 
      !nameMatches.includes(s)
    );
    if (initialMatches.length > 0) {
      groups.push({ title: '首字母匹配', items: initialMatches.slice(0, 4) });
    }
    
    return groups;
  }, [suggestions, query]);

  return (
    <div className="w-full max-w-2xl mx-auto relative z-[60]" ref={searchRef}>
      {/* 搜索框 */}
      <div className="relative group">
        <form onSubmit={handleSearch} className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
          </div>
          
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => query.trim() && suggestions.length > 0 && setShowSuggestions(true)}
            onKeyDown={onKeyDown}
            placeholder="输入股票代码 / 名称 / 拼音首字母"
            className="block w-full pl-11 pr-24 py-4 text-base bg-white border-2 border-gray-200 rounded-2xl 
                       placeholder:text-gray-400
                       focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10
                       transition-all duration-200 ease-out
                       shadow-sm hover:shadow-md"
          />
          
          {/* 清除按钮 */}
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setSuggestions([]);
                setShowSuggestions(false);
                inputRef.current?.focus();
              }}
              className="absolute inset-y-0 right-20 flex items-center px-2 text-gray-400 hover:text-gray-600 
                         transition-colors rounded-full hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          
          {/* 搜索按钮 */}
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 
                       px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 
                       text-white font-medium rounded-xl
                       hover:from-blue-700 hover:to-blue-800 
                       active:scale-95 transition-all duration-200
                       shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40"
          >
            搜索
          </button>
        </form>
      </div>

      {/* 下拉建议列表 */}
      {showSuggestions && (
        <div className="absolute z-[100] w-full mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 
                        overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200" style={{ position: 'absolute' }}>
          {/* 加载状态 */}
          {loading ? (
            <div className="flex items-center justify-center py-8 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span>搜索中...</span>
            </div>
          ) : (
            <div className="max-h-[400px] overflow-y-auto">
              {/* 分组显示 */}
              {groupedSuggestions.map((group, groupIdx) => (
                <div key={group.title}>
                  {/* 分组标题 */}
                  <div className="px-4 py-2 bg-gray-50/80 text-xs font-semibold text-gray-500 
                                  uppercase tracking-wider border-y border-gray-100 first:border-t-0">
                    {group.title}
                  </div>
                  
                  {/* 分组内容 */}
                  {group.items.map((stock, idx) => {
                    const globalIdx = suggestions.indexOf(stock);
                    const isActive = globalIdx === selectedIndex;
                    const marketInfo = getMarketInfo(stock.market);
                    
                    return (
                      <button
                        key={stock.symbol}
                        onClick={() => handleSelectStock(stock)}
                        onMouseEnter={() => setSelectedIndex(globalIdx)}
                        className={`w-full px-4 py-3.5 flex items-center justify-between
                                   transition-all duration-150
                                   ${isActive 
                                     ? 'bg-gradient-to-r from-blue-50 to-blue-100/50 border-l-4 border-blue-500' 
                                     : 'hover:bg-gray-50 border-l-4 border-transparent'
                                   }`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {/* 市场标签 */}
                          <span className={`flex-shrink-0 w-7 h-7 flex items-center justify-center 
                                           text-xs font-bold rounded-lg ${marketInfo.bg} ${marketInfo.color}`}>
                            {marketInfo.label}
                          </span>
                          
                          {/* 股票信息 */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <HighlightText 
                                text={stock.name} 
                                query={query} 
                                className="font-semibold text-gray-900 truncate"
                              />
                              <span className="text-xs text-gray-400 font-mono">
                                {stock.initials}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <HighlightText 
                                text={stock.code} 
                                query={query} 
                                className="text-sm text-gray-500 font-mono"
                              />
                              <span className="text-xs text-gray-300">|</span>
                              <span className="text-xs text-gray-400">{stock.symbol}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* 右侧图标 */}
                        {isActive && (
                          <TrendingUp className="w-5 h-5 text-blue-500 animate-pulse" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
              
              {/* 无结果提示 */}
              {groupedSuggestions.length === 0 && (
                <div className="py-8 text-center text-gray-500">
                  <Search className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  <p>未找到匹配的股票</p>
                  <p className="text-sm text-gray-400 mt-1">试试输入代码、名称或首字母</p>
                </div>
              )}
            </div>
          )}
          
          {/* 底部提示 */}
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-400 
                          flex items-center justify-between">
            <span>↑↓ 选择 · Enter 确认 · Esc 关闭</span>
            <span>共 {suggestions.length} 条结果</span>
          </div>
        </div>
      )}

      {/* 搜索历史 */}
      {history.length > 0 && !onSearch && !showSuggestions && (
        <div className="mt-4 animate-in fade-in slide-in-from-top-1 duration-300">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-500 flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              最近搜索
            </h3>
            <button 
              onClick={() => {
                setHistory([]);
                localStorage.removeItem('searchHistory');
              }}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              清除
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {history.map((item) => (
              <button
                key={item}
                onClick={() => navigate(`/analysis/${item}`)}
                className="group flex items-center gap-1.5 px-3 py-1.5 
                           bg-white border border-gray-200 rounded-lg
                           text-sm text-gray-600 
                           hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/50
                           transition-all duration-200"
              >
                <Clock className="w-3 h-3 text-gray-400 group-hover:text-blue-500" />
                {item}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBar;
