import React, { useState, useMemo, useEffect } from 'react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell 
} from 'recharts';
import { 
  LayoutDashboard, TrendingUp, CheckCircle2, XCircle, AlertCircle, 
  CalendarDays, Filter, ChevronRight, Activity, FileText, ListFilter, Loader2
} from 'lucide-react';

// --- 1. 資料結構定義 (定義屬性字典) ---
const indicatorMeta = {
  "化學治療靜脈給藥過程完成率": { type: "avg", isNegative: false, unit: "%" },
  "化療藥品外滲處理過程完成率": { type: "avg", isNegative: false, unit: "%" },
  "化療藥品外滲發生處理完成率": { type: "avg", isNegative: false, unit: "%" },
  "非起疱性化療藥品外滲發生件數": { type: "sum", isNegative: true, unit: "件" },
  "起疱性化療藥品外滲發生件數": { type: "sum", isNegative: true, unit: "件" },
  "針劑型化療給藥護理紀錄完整率": { type: "avg", isNegative: false, unit: "%" },
  "針劑型化療藥品給藥異常件數": { type: "sum", isNegative: true, unit: "件" },
  "護理師處理化療給藥自我安全防護完整率": { type: "avg", isNegative: false, unit: "%" }
};

// --- API 設定 ---
const API_URL = "https://script.google.com/macros/s/AKfycbwv5ib2h1GQB3KO2G0ZWfkOqjE8cNy3I1JORtqKFmP0HFvL_E2EBqCey4A8cmckdIZh/exec";

// --- 輔助計算函數 ---
const calculateAggregate = (values, type) => {
  const validValues = values.filter(v => v !== null && v !== undefined);
  if (validValues.length === 0) return null;
  
  const sum = validValues.reduce((a, b) => a + b, 0);
  if (type === 'sum') return sum;
  return +(sum / validValues.length).toFixed(1);
};

const checkIsSuccess = (value, target, isNegative) => {
  if (value === null) return null;
  return isNegative ? value <= target : value >= target;
};


// --- 主元件 ---
export default function App() {
  // --- 狀態管理 ---
  const [rawData, setRawData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedYears, setSelectedYears] = useState([]);
  const [selectedMonths, setSelectedMonths] = useState([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  const [currentView, setCurrentView] = useState('overview'); // 'overview' | 'detail'
  const [selectedIndicator, setSelectedIndicator] = useState(null);
  const [timeDimension, setTimeDimension] = useState('month'); // 'month' | 'quarter'

  // --- 生命週期：載入外部資料 ---
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(API_URL);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const json = await response.json();
        // 確保相容 Apps Script 的各式回傳格式 (直接陣列 或 包裝在 data 屬性中)
        const rows = Array.isArray(json) ? json : (json.data || json.result || []);

        // 轉換為前端所需的統一結構
        const formattedData = rows.map(row => {
          const year = String(row['年度'] || row.year || row.Year || '');
          const indicator = row['品質指標'] || row.indicator || row.Indicator || '';
          
          // 處理目標值 (去除可能含有的 %, 逗號等)
          let rawTarget = row['今年目標值(無特殊符號)'] ?? row['今年目標值'] ?? row.target ?? 0;
          if (typeof rawTarget === 'string') rawTarget = rawTarget.replace(/[% ,]/g, '');
          const target = Number(rawTarget) || 0;

          const review = row['檢討與改善'] || row.review || row.Review || '';

          // 處理 1 到 12 月份數值
          const monthly = [];
          for (let i = 1; i <= 12; i++) {
            let val = row[`${i}月`] ?? row[`${i} 月`] ?? row[`month${i}`];
            if (val === "" || val === null || val === undefined || String(val).trim() === "") {
              monthly.push(null);
            } else {
              if (typeof val === 'string') val = val.replace(/[% ,]/g, '');
              monthly.push(Number(val));
            }
          }

          return { year, indicator, target, monthly, review };
        }).filter(d => d.year && d.indicator); // 過濾掉無效資料

        setRawData(formattedData);

        // 自動推算可用的年份，並預設勾選最新的一年或兩年
        const availableYears = [...new Set(formattedData.map(d => d.year))].sort();
        if (availableYears.length > 0) {
          setSelectedYears(availableYears.slice(-2)); // 預設選取最後兩年
        }

      } catch (err) {
        console.error("Fetch error:", err);
        setError("無法取得資料，請確認您的 API 網址或網路狀態。");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // --- 動態計算選項清單 ---
  const availableYearsList = useMemo(() => {
    return [...new Set(rawData.map(d => d.year))].sort();
  }, [rawData]);

  // --- 資料處理 (依據過濾器) ---

  // 1. Overview 資料：計算選定期間內各指標的總結算數值
  const overviewData = useMemo(() => {
    if (!rawData.length) return [];
    
    return Object.keys(indicatorMeta).map(indicatorName => {
      const meta = indicatorMeta[indicatorName];
      
      const indicatorRecords = rawData.filter(d => 
        d.indicator === indicatorName && selectedYears.includes(d.year)
      );

      let allRelevantValues = [];
      let latestTarget = 0;

      indicatorRecords.forEach(record => {
        const valuesForSelectedMonths = selectedMonths.map(m => record.monthly[m - 1]);
        allRelevantValues = [...allRelevantValues, ...valuesForSelectedMonths];
        
        if (record.year >= (indicatorRecords[indicatorRecords.length-1]?.year || '0')) {
          latestTarget = record.target;
        }
      });

      const calculatedValue = calculateAggregate(allRelevantValues, meta.type);
      const isSuccess = checkIsSuccess(calculatedValue, latestTarget, meta.isNegative);

      return {
        name: indicatorName,
        meta,
        value: calculatedValue,
        target: latestTarget,
        isSuccess
      };
    });
  }, [rawData, selectedYears, selectedMonths]);

  // 計算整體達標率
  const overallSuccessRate = useMemo(() => {
    const validIndicators = overviewData.filter(d => d.value !== null);
    if (validIndicators.length === 0) return 0;
    const successCount = validIndicators.filter(d => d.isSuccess).length;
    return Math.round((successCount / validIndicators.length) * 100);
  }, [overviewData]);


  // 2. Detail 資料：準備給 Recharts 的格式
  const detailChartData = useMemo(() => {
    if (!selectedIndicator || !rawData.length) return [];
    
    const meta = indicatorMeta[selectedIndicator];
    const records = rawData.filter(d => 
      d.indicator === selectedIndicator && selectedYears.includes(d.year)
    );

    let chartData = [];

    if (timeDimension === 'month') {
      selectedMonths.forEach(monthNum => {
        const dataPoint = { name: `${monthNum}月` };
        records.forEach(record => {
          dataPoint[record.year] = record.monthly[monthNum - 1];
        });
        chartData.push(dataPoint);
      });
    } else {
      const quarters = [
        { name: 'Q1', months: [1, 2, 3] },
        { name: 'Q2', months: [4, 5, 6] },
        { name: 'Q3', months: [7, 8, 9] },
        { name: 'Q4', months: [10, 11, 12] }
      ];

      quarters.forEach(q => {
        const hasSelectedMonthInQ = q.months.some(m => selectedMonths.includes(m));
        if (!hasSelectedMonthInQ) return;

        const dataPoint = { name: q.name };
        records.forEach(record => {
          const qValues = q.months
            .filter(m => selectedMonths.includes(m))
            .map(m => record.monthly[m - 1]);
          dataPoint[record.year] = calculateAggregate(qValues, meta.type);
        });
        chartData.push(dataPoint);
      });
    }

    return chartData;
  }, [rawData, selectedIndicator, selectedYears, selectedMonths, timeDimension]);

  // 取得最新檢討回饋
  const latestReview = useMemo(() => {
    if (!selectedIndicator || selectedYears.length === 0 || !rawData.length) return "";
    const sortedYears = [...selectedYears].sort((a, b) => b.localeCompare(a));
    const record = rawData.find(d => d.indicator === selectedIndicator && d.year === sortedYears[0]);
    return record && record.review ? `(${sortedYears[0]}年度) ${record.review}` : "暫無檢討紀錄";
  }, [rawData, selectedIndicator, selectedYears]);

  // --- 事件處理 ---

  const toggleYear = (year) => {
    setSelectedYears(prev => 
      prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year].sort()
    );
  };

  const toggleMonth = (month) => {
    setSelectedMonths(prev => 
      prev.includes(month) ? prev.filter(m => m !== month).sort((a,b)=>a-b) : [...prev, month].sort((a,b)=>a-b)
    );
  };

  const handleIndicatorJump = (indicatorName) => {
    setSelectedIndicator(indicatorName);
    setCurrentView('detail');
  };

  const getTargetForYear = (year) => {
    if(!selectedIndicator) return 0;
    const record = rawData.find(d => d.indicator === selectedIndicator && d.year === year);
    return record ? record.target : 0;
  };

  // --- 載入與錯誤畫面 ---
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 font-sans">
        <div className="flex flex-col items-center gap-4 text-blue-600">
          <Loader2 className="w-10 h-10 animate-spin" />
          <p className="font-medium text-slate-600 tracking-wide">載入雲端資料庫中，請稍候...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 font-sans">
        <div className="flex flex-col items-center gap-4 text-rose-500 bg-rose-50 p-8 rounded-2xl shadow-sm border border-rose-100 max-w-md text-center">
          <AlertCircle className="w-12 h-12" />
          <h2 className="text-xl font-bold">資料連線失敗</h2>
          <p className="text-slate-600 text-sm">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-6 py-2.5 bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition-colors font-medium shadow-sm"
          >
            重新載入
          </button>
        </div>
      </div>
    );
  }

  // --- 主要畫面渲染 ---
  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden">
      
      {/* --- 左側 Sidebar --- */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shadow-sm z-10">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-2 text-blue-700 font-bold text-xl mb-1">
            <Activity className="w-6 h-6" />
            <span>癌症照護品管中心</span>
          </div>
          <p className="text-xs text-slate-400">品質指標監測儀表板</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* 過濾器：年份 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <CalendarDays className="w-4 h-4 text-slate-400" />
              <span>年度篩選區間</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {availableYearsList.length > 0 ? availableYearsList.map(year => (
                <button
                  key={year}
                  onClick={() => toggleYear(year)}
                  className={`py-2 px-3 rounded-xl text-sm font-medium transition-all duration-200 border ${
                    selectedYears.includes(year)
                      ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  {year}
                </button>
              )) : <div className="text-sm text-slate-400 col-span-2">無年份資料</div>}
            </div>
          </div>

          {/* 過濾器：月份 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Filter className="w-4 h-4 text-slate-400" />
              <span>月份詳細核取</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(month => (
                <button
                  key={month}
                  onClick={() => toggleMonth(month)}
                  className={`py-1.5 text-xs rounded-lg font-medium transition-all duration-200 border ${
                    selectedMonths.includes(month)
                      ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {month}月
                </button>
              ))}
            </div>
          </div>

          {/* 快速跳轉 */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <ListFilter className="w-4 h-4 text-slate-400" />
              <span>快速跳轉指標</span>
            </div>
            <div className="relative">
              <select
                value={selectedIndicator || ""}
                onChange={(e) => {
                  if(e.target.value) handleIndicatorJump(e.target.value);
                }}
                className="w-full appearance-none bg-white border border-slate-200 text-slate-700 text-sm rounded-xl px-4 py-3 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
              >
                <option value="" disabled>請選擇要檢視的指標...</option>
                {Object.keys(indicatorMeta).map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>
          </div>

        </div>
      </aside>

      {/* --- 右側主要內容區 --- */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* Header 視圖切換 */}
        <header className="bg-white px-8 py-5 border-b border-slate-200 flex justify-between items-center shrink-0 z-10 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              {currentView === 'overview' ? '全院品質總覽' : '單一指標趨勢分析'}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              資料區間：{selectedYears.length > 0 ? selectedYears.join(', ') : '未選擇年份'} 年 
              ({selectedMonths.length} 個月份)
            </p>
          </div>
          
          <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner border border-slate-200">
            <button
              onClick={() => { setCurrentView('overview'); setSelectedIndicator(null); }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                currentView === 'overview' 
                  ? 'bg-white text-blue-700 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              總覽視圖
            </button>
            <button
              onClick={() => selectedIndicator && setCurrentView('detail')}
              disabled={!selectedIndicator}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                currentView === 'detail' 
                  ? 'bg-white text-blue-700 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              分析視圖
            </button>
          </div>
        </header>

        {/* 內容捲動區 */}
        <div className="flex-1 overflow-auto p-8 relative">
          
          {/* ========== 模式 A：總覽視圖 ========== */}
          {currentView === 'overview' && (
            <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
              
              {/* 大看板 */}
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] p-8 text-white shadow-xl flex items-center justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white opacity-10 blur-3xl"></div>
                <div className="relative z-10">
                  <h2 className="text-blue-100 text-lg font-medium mb-2">所選期間整體達標率</h2>
                  <div className="flex items-baseline gap-3">
                    <span className="text-6xl font-bold tracking-tight">{overallSuccessRate}%</span>
                    <span className="text-blue-200 text-sm">
                      ({overviewData.filter(d => d.isSuccess).length} / {overviewData.filter(d => d.value !== null).length} 達標指標)
                    </span>
                  </div>
                </div>
                <div className="hidden md:flex items-center justify-center w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm relative z-10">
                  <Activity className="w-12 h-12 text-white" />
                </div>
              </div>

              {/* 戰情卡片網格 */}
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-slate-400" />
                  各項指標結算
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {overviewData.map((item, idx) => (
                    <div 
                      key={idx}
                      onClick={() => handleIndicatorJump(item.name)}
                      className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer group flex flex-col h-full relative overflow-hidden"
                    >
                      {/* 頂部狀態與裝飾 */}
                      <div className={`absolute top-0 left-0 w-full h-1 ${item.isSuccess ? 'bg-emerald-500' : item.value === null ? 'bg-slate-200' : 'bg-rose-500'}`}></div>
                      
                      <div className="flex justify-between items-start mb-4 mt-1">
                        <div className={`p-2 rounded-xl ${item.isSuccess ? 'bg-emerald-50 text-emerald-600' : item.value === null ? 'bg-slate-50 text-slate-400' : 'bg-rose-50 text-rose-600'}`}>
                          {item.isSuccess ? <CheckCircle2 className="w-5 h-5" /> : item.value === null ? <AlertCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                        </div>
                        <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded-md">
                          {item.meta.type === 'avg' ? '平均' : '加總'}
                        </span>
                      </div>
                      
                      <h4 className="text-sm font-semibold text-slate-700 leading-snug flex-1 mb-4 group-hover:text-blue-700 transition-colors">
                        {item.name}
                      </h4>
                      
                      <div className="mt-auto">
                        <div className="flex items-end gap-1 mb-1">
                          {item.value !== null ? (
                            <>
                              <span className={`text-2xl font-bold ${item.isSuccess ? 'text-slate-800' : 'text-rose-600'}`}>
                                {item.value}
                              </span>
                              <span className="text-sm font-medium text-slate-500 mb-0.5">{item.meta.unit}</span>
                            </>
                          ) : (
                            <span className="text-xl font-bold text-slate-400">無資料</span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-1">
                          目標: {item.target} {item.meta.unit}
                          {item.meta.isNegative ? '(↓)' : '(↑)'}
                        </div>
                      </div>
                      
                      {/* Hover Arrow */}
                      <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all">
                        <ChevronRight className="w-5 h-5 text-blue-500" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========== 模式 B：單一指標分析 ========== */}
          {currentView === 'detail' && selectedIndicator && (
            <div className="max-w-6xl mx-auto space-y-6 animate-in slide-in-from-right-8 duration-500">
              
              {/* 指標標頭與切換 */}
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <button onClick={() => setCurrentView('overview')} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors">
                      <ChevronRight className="w-5 h-5 rotate-180" />
                    </button>
                    <h2 className="text-xl font-bold text-slate-800">{selectedIndicator}</h2>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 pl-9">
                    <span className="bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                      運算: {indicatorMeta[selectedIndicator].type === 'avg' ? '平均值' : '加總值'}
                    </span>
                    <span className="bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 flex items-center gap-1">
                      方向: {indicatorMeta[selectedIndicator].isNegative ? <span className="text-rose-600 font-medium">越低越好</span> : <span className="text-emerald-600 font-medium">越高越好</span>}
                    </span>
                    <span className="bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                      單位: {indicatorMeta[selectedIndicator].unit}
                    </span>
                  </div>
                </div>

                {/* X軸維度切換 */}
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() => setTimeDimension('month')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${timeDimension === 'month' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    依月份展開
                  </button>
                  <button
                    onClick={() => setTimeDimension('quarter')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${timeDimension === 'quarter' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    依季度聚合
                  </button>
                </div>
              </div>

              {/* 圖表區塊 */}
              <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-200 min-h-[450px] flex flex-col">
                <h3 className="text-slate-700 font-semibold mb-6 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                  趨勢圖表
                </h3>
                <div className="flex-1 w-full relative">
                  {detailChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={400}>
                      {indicatorMeta[selectedIndicator].type === 'avg' ? (
                        // --- 折線圖 (Avg 類型) ---
                        <LineChart data={detailChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dx={-10} domain={['auto', 'auto']} />
                          <Tooltip 
                            contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            labelStyle={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }}
                          />
                          <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                          
                          {selectedYears.map((year, i) => {
                            const colors = ['#2563eb', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#10b981'];
                            return (
                              <Line 
                                key={year} 
                                type="monotone" 
                                dataKey={year} 
                                stroke={colors[i % colors.length]} 
                                strokeWidth={3}
                                dot={{ r: 4, strokeWidth: 2 }}
                                activeDot={{ r: 6, strokeWidth: 0 }}
                                connectNulls
                              />
                            )
                          })}
                        </LineChart>
                      ) : (
                        // --- 長條圖 (Sum 類型) ---
                        <BarChart data={detailChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dx={-10} />
                          <Tooltip 
                            contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            cursor={{ fill: '#f1f5f9' }}
                          />
                          <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                          
                          {selectedYears.map((year, i) => {
                            const target = getTargetForYear(year);
                            const isNeg = indicatorMeta[selectedIndicator].isNegative;
                            
                            return (
                              <Bar key={year} dataKey={year} radius={[4, 4, 0, 0]} maxBarSize={50}>
                                {detailChartData.map((entry, index) => {
                                  const val = entry[year];
                                  let fill = '#94a3b8'; // default
                                  if (val !== undefined && val !== null) {
                                     const success = checkIsSuccess(val, target, isNeg);
                                     fill = success ? '#10b981' : '#f43f5e';
                                  }
                                  return <Cell key={`cell-${index}`} fill={fill} />;
                                })}
                              </Bar>
                            )
                          })}
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                      沒有符合篩選條件的資料可供顯示
                    </div>
                  )}
                </div>
              </div>

              {/* 檢討回饋區 */}
              <div className="bg-blue-50 border border-blue-100 rounded-[2rem] p-6 md:p-8 flex gap-4 items-start shadow-sm">
                <div className="bg-blue-100 p-3 rounded-xl shrink-0 mt-1">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-blue-900 mb-2">最新檢討與改善回饋</h3>
                  <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {latestReview}
                  </p>
                </div>
              </div>

            </div>
          )}
        </div>
      </main>
    </div>
  );
}
