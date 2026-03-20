import React, { useState, useMemo, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';
import {
  LayoutDashboard,
  TrendingUp,
  CheckCircle2,
  XCircle,
  AlertCircle,
  CalendarDays,
  Filter,
  ChevronRight,
  Activity,
  FileText,
  ListFilter,
  Loader2,
} from 'lucide-react';

// --- 指標屬性定義 ---
const DEFAULT_INDICATOR_META = {
  化學治療靜脈給藥過程完成率: { type: 'avg', isNegative: false, unit: '%' },
  化療藥品外滲處理過程完成率: { type: 'avg', isNegative: false, unit: '%' },
  化療藥品外滲發生處理完成率: { type: 'avg', isNegative: false, unit: '%' },
  非起疱性化療藥品外滲發生件數: { type: 'sum', isNegative: true, unit: '件' },
  起疱性化療藥品外滲發生件數: { type: 'sum', isNegative: true, unit: '件' },
  針劑型化療給藥護理紀錄完整率: { type: 'avg', isNegative: false, unit: '%' },
  針劑型化療藥品給藥異常件數: { type: 'sum', isNegative: true, unit: '件' },
  護理師處理化療給藥自我安全防護完整率: { type: 'avg', isNegative: false, unit: '%' },
};

// --- 指標分類主題（依指定順序）---
const CATEGORY_DEFINITIONS = {
  口腔粘膜炎: [],
  疼痛: [],
  嗜中性白血球低下: [],
  化療外滲: [
    '化療藥品外滲處理過程完成率',
    '化療藥品外滲發生處理完成率',
    '非起疱性化療藥品外滲發生件數',
    '起疱性化療藥品外滲發生件數',
  ],
  化療環境維護: ['護理師處理化療給藥自我安全防護完整率'],
  治療副作用: ['針劑型化療藥品給藥異常件數'],
  'Port-A照護': ['化學治療靜脈給藥過程完成率', '針劑型化療給藥護理紀錄完整率'],
};

const INDICATOR_CATEGORY_MAP = Object.entries(CATEGORY_DEFINITIONS).reduce(
  (acc, [category, indicators]) => {
    indicators.forEach((indicator) => {
      acc[indicator] = category;
    });
    return acc;
  },
  {}
);

// --- API 設定 ---
const API_URL =
  'https://script.google.com/macros/s/AKfycbzjJgyMDSWmNzzowWRuxY5O2OrIWnIRXkpc4gMTUPVjGN49_Fi_c4RxC5k8AbjkRSY/exec';

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const QUARTERS = [
  { name: 'Q1', label: '第1季', months: [1, 2, 3] },
  { name: 'Q2', label: '第2季', months: [4, 5, 6] },
  { name: 'Q3', label: '第3季', months: [7, 8, 9] },
  { name: 'Q4', label: '第4季', months: [10, 11, 12] },
];
const ALL_QUARTER_NAMES = QUARTERS.map((q) => q.name);

const strokeCollator = new Intl.Collator('zh-Hant-u-co-stroke');

// --- 輔助函數 ---
const sortByStroke = (list) => [...list].sort((a, b) => strokeCollator.compare(a, b));

const parseMaybeNumber = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;

  const cleaned = String(value).replace(/[% ,]/g, '').trim();
  if (!cleaned) return null;

  const num = Number(cleaned);
  return Number.isNaN(num) ? null : num;
};

const formatDisplayValue = (value, unit, type) => {
  if (value === null || value === undefined) return '無資料';
  if (type === 'avg' || unit === '%') return `${Number(value).toFixed(1)}${unit}`;
  return `${Number(value)}${unit}`;
};

const calculateAggregate = (values, type) => {
  const validValues = values.filter((v) => v !== null && v !== undefined && !Number.isNaN(v));
  if (validValues.length === 0) return null;

  const sum = validValues.reduce((a, b) => a + b, 0);
  if (type === 'sum') return sum;
  return +(sum / validValues.length).toFixed(1);
};

const checkIsSuccess = (value, target, isNegative) => {
  if (value === null || value === undefined) return null;
  return isNegative ? value <= target : value >= target;
};

const buildDetailPointTarget = (record, meta, mode, activeMonthCount = 1) => {
  if (meta.type === 'avg') return record.target;
  if (mode === 'month') return +(record.target / 12).toFixed(2);
  return +((record.target * activeMonthCount) / 12).toFixed(2);
};

const getDynamicYAxisDomain = (chartData, unit) => {
  const values = chartData
    .flatMap((item) => [item.value, item.target])
    .filter((v) => v !== null && v !== undefined && !Number.isNaN(v));

  if (!values.length) return ['auto', 'auto'];

  const min = Math.min(...values);
  const max = Math.max(...values);

  if (unit === '%') {
    const range = max - min;
    const padding = Math.max(0.5, range * 0.8);

    let domainMin = +(min - padding).toFixed(1);
    let domainMax = +(max + padding).toFixed(1);

    if (domainMax - domainMin < 2) {
      const center = (min + max) / 2;
      domainMin = +(center - 1).toFixed(1);
      domainMax = +(center + 1).toFixed(1);
    }

    domainMin = Math.max(0, domainMin);
    domainMax = Math.min(100, domainMax);

    return [domainMin, domainMax];
  }

  const range = max - min;
  const padding = Math.max(1, Math.ceil(range * 0.5));

  let domainMin = Math.floor(min - padding);
  let domainMax = Math.ceil(max + padding);

  if (domainMin < 0) domainMin = 0;
  if (domainMax === domainMin) domainMax = domainMin + 2;

  return [domainMin, domainMax];
};

const getMonthlyFromRow = (row) => {
  if (Array.isArray(row.monthly)) {
    const normalized = row.monthly.slice(0, 12).map(parseMaybeNumber);
    while (normalized.length < 12) normalized.push(null);
    return normalized;
  }

  const monthly = [];
  for (let i = 1; i <= 12; i += 1) {
    const raw =
      row[`${i}月`] ??
      row[`${i} 月`] ??
      row[`m${i}`] ??
      row[`month${i}`] ??
      row[`Month${i}`] ??
      null;
    monthly.push(parseMaybeNumber(raw));
  }
  return monthly;
};

const normalizeRows = (payload) => {
  let rows = [];

  if (Array.isArray(payload?.rawData)) rows = payload.rawData;
  else if (Array.isArray(payload?.data)) rows = payload.data;
  else if (Array.isArray(payload?.result)) rows = payload.result;
  else if (Array.isArray(payload)) rows = payload;

  return rows
    .map((row) => ({
      year: String(row.year ?? row['年度'] ?? row.Year ?? '').trim(),
      indicator: String(row.indicator ?? row['品質指標'] ?? row.Indicator ?? '').trim(),
      target:
        parseMaybeNumber(
          row.target ?? row['今年目標值(無特殊符號)'] ?? row['今年目標值'] ?? row.Target ?? 0
        ) ?? 0,
      monthly: getMonthlyFromRow(row),
      review: String(row.review ?? row['檢討與改善'] ?? row.Review ?? ''),
    }))
    .filter((row) => row.year && row.indicator);
};

const extractIndicatorMeta = (payload, rows) => {
  const apiMeta =
    payload?.indicatorMeta && typeof payload.indicatorMeta === 'object' ? payload.indicatorMeta : {};
  const mergedMeta = { ...DEFAULT_INDICATOR_META, ...apiMeta };

  rows.forEach((row) => {
    if (!mergedMeta[row.indicator]) {
      mergedMeta[row.indicator] = { type: 'avg', isNegative: false, unit: '%' };
    }
  });

  return mergedMeta;
};

const loadJsonp = (url) =>
  new Promise((resolve, reject) => {
    const callbackName = `dashboardJsonp_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const script = document.createElement('script');

    window[callbackName] = (data) => {
      resolve(data);
      cleanup();
    };

    const cleanup = () => {
      delete window[callbackName];
      if (script.parentNode) script.parentNode.removeChild(script);
    };

    script.src = `${url}${url.includes('?') ? '&' : '?'}callback=${callbackName}`;
    script.async = true;
    script.onerror = () => {
      cleanup();
      reject(new Error('JSONP 載入失敗'));
    };

    document.body.appendChild(script);
  });

const getQuarterByName = (quarterName) => QUARTERS.find((q) => q.name === quarterName);

const getAllowedMonthsByQuarters = (selectedQuarters) => {
  const monthSet = new Set();
  selectedQuarters.forEach((quarterName) => {
    const quarter = getQuarterByName(quarterName);
    if (!quarter) return;
    quarter.months.forEach((month) => monthSet.add(month));
  });
  return MONTHS.filter((month) => monthSet.has(month));
};

const formatQuarterSummary = (quarterNames) => {
  if (!quarterNames.length || quarterNames.length === QUARTERS.length) return '全部季別';
  return quarterNames.join('、');
};

const CustomXAxisTick = ({ x, y, payload, isMobile }) => {
  const raw = String(payload?.value ?? '');
  let line1 = raw;
  let line2 = '';

  if (raw.includes('/')) {
    const [year, month] = raw.split('/');
    line1 = year;
    line2 = `${month}月`;
  } else if (raw.includes(' ')) {
    const [year, period] = raw.split(' ');
    line1 = year;
    line2 = period;
  }

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        textAnchor="middle"
        fill="#64748b"
        fontSize={isMobile ? 10 : 12}
      >
        <tspan x="0" dy="0.2em">
          {line1}
        </tspan>
        {line2 ? (
          <tspan x="0" dy="1.35em">
            {line2}
          </tspan>
        ) : null}
      </text>
    </g>
  );
};

export default function App() {
  const [indicatorMeta, setIndicatorMeta] = useState(DEFAULT_INDICATOR_META);
  const [rawData, setRawData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [apiStatus, setApiStatus] = useState('loading');
  const [apiMessage, setApiMessage] = useState('正在載入線上資料...');

  const [selectedYears, setSelectedYears] = useState([]);
  const [selectedQuarters, setSelectedQuarters] = useState(ALL_QUARTER_NAMES);
  const [selectedMonths, setSelectedMonths] = useState(MONTHS);

  const [currentView, setCurrentView] = useState('overview');
  const [selectedIndicator, setSelectedIndicator] = useState(null);
  const [timeDimension, setTimeDimension] = useState('month');

  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1440
  );

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
    return undefined;
  }, []);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setApiStatus('loading');
        setApiMessage('正在載入線上資料...');

        let payload = null;
        let directFetchError = null;

        try {
          const response = await fetch(API_URL, { method: 'GET' });
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          payload = await response.json();
        } catch (fetchError) {
          directFetchError = fetchError;
        }

        if (!payload) {
          payload = await loadJsonp(API_URL);
        }

        const rows = normalizeRows(payload);
        const meta = extractIndicatorMeta(payload, rows);

        setIndicatorMeta(meta);
        setRawData(rows);

        if (rows.length > 0) {
          setApiStatus('success');
          setApiMessage(`已載入 ${rows.length} 筆資料`);
        } else {
          setApiStatus('empty');
          setApiMessage('API 有回應，但 rawData 是空的');
          if (directFetchError) {
            console.warn('Direct fetch failed, JSONP returned empty payload:', directFetchError);
          }
        }
      } catch (err) {
        console.error('Load data error:', err);
        setError('無法取得資料，請確認 Apps Script 是否已重新部署，且網址可正常開啟。');
        setApiStatus('error');
        setApiMessage(err.message || '無法載入資料');
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const availableYearsList = useMemo(() => {
    return [...new Set(rawData.map((d) => String(d.year)).filter(Boolean))].sort(
      (a, b) => Number(a) - Number(b)
    );
  }, [rawData]);

  useEffect(() => {
    if (!availableYearsList.length) return;

    setSelectedYears((prev) => {
      const filtered = prev.filter((year) => availableYearsList.includes(year));
      if (filtered.length) return filtered;
      return availableYearsList;
    });
  }, [availableYearsList]);

  useEffect(() => {
    const allowedMonths = getAllowedMonthsByQuarters(selectedQuarters);

    setSelectedMonths((prev) => {
      const filtered = prev.filter((month) => allowedMonths.includes(month));
      if (filtered.length > 0) return filtered;
      return allowedMonths;
    });
  }, [selectedQuarters]);

  const effectiveYears = selectedYears.length ? selectedYears : availableYearsList;

  const effectiveMonths = useMemo(() => {
    const allowedMonths = getAllowedMonthsByQuarters(selectedQuarters);
    const filtered = selectedMonths.filter((month) => allowedMonths.includes(month));
    return filtered.length > 0 ? filtered : allowedMonths;
  }, [selectedMonths, selectedQuarters]);

  const availableIndicatorNames = useMemo(() => {
    const indicators = rawData
      .filter((row) => effectiveYears.includes(row.year))
      .map((row) => row.indicator);
    return sortByStroke([...new Set(indicators)]);
  }, [rawData, effectiveYears]);

  useEffect(() => {
    if (!selectedIndicator) return;
    if (!availableIndicatorNames.includes(selectedIndicator)) {
      setSelectedIndicator(null);
      setCurrentView('overview');
    }
  }, [availableIndicatorNames, selectedIndicator]);

  const availableIndicatorGroups = useMemo(() => {
    const grouped = {};

    availableIndicatorNames.forEach((indicator) => {
      const category = INDICATOR_CATEGORY_MAP[indicator];
      if (!category) return;
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(indicator);
    });

    return Object.keys(CATEGORY_DEFINITIONS)
      .map((category) => ({
        category,
        indicators: sortByStroke(grouped[category] || []),
      }))
      .filter((group) => group.indicators.length > 0);
  }, [availableIndicatorNames]);

  const overviewData = useMemo(() => {
    if (!rawData.length) return [];

    return availableIndicatorNames.map((indicatorName) => {
      const meta = indicatorMeta[indicatorName] || { type: 'avg', isNegative: false, unit: '%' };

      const indicatorRecords = rawData
        .filter((d) => d.indicator === indicatorName && effectiveYears.includes(d.year))
        .sort((a, b) => Number(a.year) - Number(b.year));

      let allRelevantValues = [];
      let latestTarget = 0;

      indicatorRecords.forEach((record) => {
        const valuesForSelectedMonths = effectiveMonths.map((m) => record.monthly[m - 1]);
        allRelevantValues = [...allRelevantValues, ...valuesForSelectedMonths];
        latestTarget = record.target;
      });

      const calculatedValue = calculateAggregate(allRelevantValues, meta.type);
      const isSuccess = checkIsSuccess(calculatedValue, latestTarget, meta.isNegative);

      return {
        name: indicatorName,
        meta,
        value: calculatedValue,
        target: latestTarget,
        isSuccess,
        category: INDICATOR_CATEGORY_MAP[indicatorName],
      };
    });
  }, [rawData, indicatorMeta, availableIndicatorNames, effectiveYears, effectiveMonths]);

  const groupedOverviewData = useMemo(() => {
    return availableIndicatorGroups
      .map((group) => ({
        category: group.category,
        items: group.indicators
          .map((indicator) => overviewData.find((item) => item.name === indicator))
          .filter(Boolean),
      }))
      .filter((group) => group.items.length > 0);
  }, [availableIndicatorGroups, overviewData]);

  const overallSuccessRate = useMemo(() => {
    const validIndicators = overviewData.filter((d) => d.value !== null);
    if (validIndicators.length === 0) return 0;
    const successCount = validIndicators.filter((d) => d.isSuccess).length;
    return Math.round((successCount / validIndicators.length) * 100);
  }, [overviewData]);

  const detailChartData = useMemo(() => {
    if (!selectedIndicator || !rawData.length) return [];

    const meta = indicatorMeta[selectedIndicator] || { type: 'avg', isNegative: false, unit: '%' };
    const records = rawData
      .filter((d) => d.indicator === selectedIndicator && effectiveYears.includes(d.year))
      .sort((a, b) => Number(a.year) - Number(b.year));

    if (timeDimension === 'month') {
      return records.flatMap((record) =>
        effectiveMonths
          .map((monthNum) => {
            const value = record.monthly[monthNum - 1];
            if (value === null || value === undefined) return null;

            const target = buildDetailPointTarget(record, meta, 'month', 1);
            return {
              name: `${record.year}/${String(monthNum).padStart(2, '0')}`,
              year: record.year,
              period: `${monthNum}月`,
              value,
              target,
              isSuccess: checkIsSuccess(value, target, meta.isNegative),
            };
          })
          .filter(Boolean)
      );
    }

    return records.flatMap((record) =>
      QUARTERS.map((quarter) => {
        if (!selectedQuarters.includes(quarter.name)) return null;

        const activeMonths = quarter.months.filter((m) => effectiveMonths.includes(m));
        if (!activeMonths.length) return null;

        const quarterValues = activeMonths.map((m) => record.monthly[m - 1]);
        const value = calculateAggregate(quarterValues, meta.type);
        if (value === null) return null;

        const target = buildDetailPointTarget(record, meta, 'quarter', activeMonths.length);
        return {
          name: `${record.year} ${quarter.name}`,
          year: record.year,
          period: quarter.name,
          value,
          target,
          isSuccess: checkIsSuccess(value, target, meta.isNegative),
        };
      }).filter(Boolean)
    );
  }, [
    rawData,
    indicatorMeta,
    selectedIndicator,
    effectiveYears,
    effectiveMonths,
    selectedQuarters,
    timeDimension,
  ]);

  const detailYAxisDomain = useMemo(() => {
    if (!selectedIndicator) return ['auto', 'auto'];
    return getDynamicYAxisDomain(detailChartData, indicatorMeta[selectedIndicator]?.unit);
  }, [detailChartData, indicatorMeta, selectedIndicator]);

  const latestReview = useMemo(() => {
    if (!selectedIndicator || effectiveYears.length === 0 || !rawData.length) return '暫無檢討紀錄';
    const sortedYears = [...effectiveYears].sort((a, b) => Number(b) - Number(a));
    const record = rawData.find(
      (d) => d.indicator === selectedIndicator && d.year === sortedYears[0]
    );
    return record && record.review ? `(${sortedYears[0]}年度) ${record.review}` : '暫無檢討紀錄';
  }, [rawData, selectedIndicator, effectiveYears]);

  const isMobile = viewportWidth < 640;
  const isTablet = viewportWidth >= 640 && viewportWidth < 1024;
  const chartHeight = isMobile ? 340 : isTablet ? 400 : 480;
  const xAxisHeight = isMobile ? 72 : 64;

  const selectedMeta = selectedIndicator
    ? indicatorMeta[selectedIndicator] || { type: 'avg', isNegative: false, unit: '%' }
    : null;

  const chartPointWidth = isMobile ? 90 : isTablet ? 82 : 72;
  const chartMinWidth = Math.max(
    isMobile ? viewportWidth - 48 : 640,
    detailChartData.length * chartPointWidth
  );

  const toggleYear = (year) => {
    setSelectedYears((prev) => {
      if (prev.includes(year)) {
        if (prev.length === 1) return prev;
        return prev.filter((y) => y !== year);
      }
      return [...prev, year].sort((a, b) => Number(a) - Number(b));
    });
  };

  const toggleQuarter = (quarterName) => {
    setSelectedQuarters((prev) => {
      if (prev.includes(quarterName)) {
        if (prev.length === 1) return prev;
        return prev.filter((name) => name !== quarterName);
      }
      return [...prev, quarterName].sort(
        (a, b) =>
          ALL_QUARTER_NAMES.indexOf(a) - ALL_QUARTER_NAMES.indexOf(b)
      );
    });
  };

  const toggleMonth = (month) => {
    const allowedMonths = getAllowedMonthsByQuarters(selectedQuarters);
    if (!allowedMonths.includes(month)) return;

    setSelectedMonths((prev) => {
      if (prev.includes(month)) {
        const next = prev.filter((m) => m !== month).sort((a, b) => a - b);
        return next.length ? next : prev;
      }
      return [...prev, month].sort((a, b) => a - b);
    });
  };

  const handleIndicatorJump = (indicatorName) => {
    setSelectedIndicator(indicatorName);
    setCurrentView('detail');
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 font-sans">
        <div className="flex flex-col items-center gap-4 text-blue-600">
          <Loader2 className="w-10 h-10 animate-spin" />
          <p className="font-medium text-slate-600 tracking-wide">載入雲端資料庫中，請稍候...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 font-sans p-4">
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      <div className="flex min-h-screen flex-col xl:flex-row">
        <aside className="w-full xl:w-80 bg-white border-b xl:border-b-0 xl:border-r border-slate-200 shadow-sm z-10">
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-center gap-2 text-blue-700 font-bold text-xl mb-1">
              <Activity className="w-6 h-6" />
              <span>癌症護理品管指標</span>
            </div>
            <p className="text-xs text-slate-400">品質指標監測儀表板</p>
          </div>

          <div className="p-6 space-y-8 xl:h-[calc(100vh-97px)] xl:overflow-y-auto">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
              {apiStatus === 'loading' && <span className="text-slate-600">正在載入線上資料...</span>}
              {apiStatus === 'success' && <span className="text-emerald-700">{apiMessage}</span>}
              {apiStatus === 'empty' && <span className="text-amber-700">{apiMessage}</span>}
              {apiStatus === 'error' && <span className="text-rose-700">{apiMessage}</span>}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <CalendarDays className="w-4 h-4 text-slate-400" />
                <span>年度篩選</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-2 gap-2">
                {availableYearsList.length > 0 ? (
                  availableYearsList.map((year) => (
                    <button
                      key={year}
                      onClick={() => toggleYear(year)}
                      className={`py-2 px-3 rounded-xl text-sm font-medium transition-all duration-200 border ${
                        effectiveYears.includes(year)
                          ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm'
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      {year}
                    </button>
                  ))
                ) : (
                  <div className="text-sm text-slate-400 col-span-2">無年份資料</div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Filter className="w-4 h-4 text-slate-400" />
                <span>季別篩選</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-2 gap-2">
                {QUARTERS.map((quarter) => (
                  <button
                    key={quarter.name}
                    onClick={() => toggleQuarter(quarter.name)}
                    className={`py-2 px-3 rounded-xl text-sm font-medium transition-all duration-200 border ${
                      selectedQuarters.includes(quarter.name)
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    {quarter.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Filter className="w-4 h-4 text-slate-400" />
                <span>月份詳細核取</span>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 xl:grid-cols-4 gap-2">
                {MONTHS.map((month) => {
                  const isAllowed = getAllowedMonthsByQuarters(selectedQuarters).includes(month);
                  const isSelected = effectiveMonths.includes(month);

                  return (
                    <button
                      key={month}
                      onClick={() => toggleMonth(month)}
                      disabled={!isAllowed}
                      className={`py-1.5 text-xs rounded-lg font-medium transition-all duration-200 border ${
                        !isAllowed
                          ? 'bg-slate-100 border-slate-100 text-slate-300 cursor-not-allowed'
                          : isSelected
                          ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {month}月
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                月份會依已選季別自動限制。例如只選 Q1，則僅能選 1–3 月。
              </p>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <ListFilter className="w-4 h-4 text-slate-400" />
                <span>快速跳轉指標</span>
              </div>

              <div className="relative">
                <select
                  value={selectedIndicator || ''}
                  onChange={(e) => {
                    if (e.target.value) handleIndicatorJump(e.target.value);
                  }}
                  className="w-full appearance-none bg-white border border-slate-200 text-slate-700 text-sm rounded-xl px-4 py-3 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                >
                  <option value="" disabled>
                    請選擇要檢視的指標...
                  </option>
                  {availableIndicatorGroups.map((group) => (
                    <optgroup key={group.category} label={group.category}>
                      {group.indicators.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-sm font-semibold text-slate-700">年度可用指標分類</div>
                {availableIndicatorGroups.length > 0 ? (
                  availableIndicatorGroups.map((group) => (
                    <div key={group.category} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <div className="text-sm font-semibold text-slate-700 mb-2">{group.category}</div>
                      <div className="flex flex-wrap gap-2">
                        {group.indicators.map((indicator) => (
                          <button
                            key={indicator}
                            onClick={() => handleIndicatorJump(indicator)}
                            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                          >
                            {indicator}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-slate-400">目前篩選年度無可用指標</div>
                )}
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 min-w-0 flex flex-col overflow-hidden relative">
          <header className="bg-white px-4 sm:px-6 lg:px-8 py-5 border-b border-slate-200 flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 shrink-0 z-10 shadow-sm">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                {currentView === 'overview' ? '總覽' : '單一指標'}
              </h1>
              <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                資料區間：{effectiveYears.length > 0 ? effectiveYears.join(', ') : '未選擇年份'} 年｜
                {formatQuarterSummary(selectedQuarters)}｜
                {effectiveMonths.length} 個月份
              </p>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner border border-slate-200 self-start lg:self-auto">
              <button
                onClick={() => {
                  setCurrentView('overview');
                  setSelectedIndicator(null);
                }}
                className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
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
                className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
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

          <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 relative">
            {currentView === 'overview' && (
              <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] p-6 sm:p-8 text-white shadow-xl flex items-center justify-between relative overflow-hidden">
                  <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white opacity-10 blur-3xl"></div>
                  <div className="relative z-10">
                    <h2 className="text-blue-100 text-lg font-medium mb-2">所選期間整體達標率</h2>
                    <div className="flex flex-wrap items-baseline gap-3">
                      <span className="text-5xl sm:text-6xl font-bold tracking-tight">
                        {overallSuccessRate}%
                      </span>
                      <span className="text-blue-200 text-sm">
                        ({overviewData.filter((d) => d.isSuccess).length} /{' '}
                        {overviewData.filter((d) => d.value !== null).length} 達標指標)
                      </span>
                    </div>
                  </div>
                  <div className="hidden md:flex items-center justify-center w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm relative z-10">
                    <Activity className="w-12 h-12 text-white" />
                  </div>
                </div>

                {groupedOverviewData.map((group) => (
                  <div key={group.category}>
                    <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-slate-400" />
                      {group.category}
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
                      {group.items.map((item, idx) => (
                        <div
                          key={`${group.category}-${idx}`}
                          onClick={() => handleIndicatorJump(item.name)}
                          className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer group flex flex-col h-full relative overflow-hidden"
                        >
                          <div
                            className={`absolute top-0 left-0 w-full h-1 ${
                              item.isSuccess
                                ? 'bg-emerald-500'
                                : item.value === null
                                ? 'bg-slate-200'
                                : 'bg-rose-500'
                            }`}
                          ></div>

                          <div className="flex justify-between items-start mb-4 mt-1">
                            <div
                              className={`p-2 rounded-xl ${
                                item.isSuccess
                                  ? 'bg-emerald-50 text-emerald-600'
                                  : item.value === null
                                  ? 'bg-slate-50 text-slate-400'
                                  : 'bg-rose-50 text-rose-600'
                              }`}
                            >
                              {item.isSuccess ? (
                                <CheckCircle2 className="w-5 h-5" />
                              ) : item.value === null ? (
                                <AlertCircle className="w-5 h-5" />
                              ) : (
                                <XCircle className="w-5 h-5" />
                              )}
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
                                  <span
                                    className={`text-2xl font-bold ${
                                      item.isSuccess ? 'text-slate-800' : 'text-rose-600'
                                    }`}
                                  >
                                    {item.meta.type === 'avg' || item.meta.unit === '%'
                                      ? Number(item.value).toFixed(1)
                                      : item.value}
                                  </span>
                                  <span className="text-sm font-medium text-slate-500 mb-0.5">
                                    {item.meta.unit}
                                  </span>
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

                          <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all">
                            <ChevronRight className="w-5 h-5 text-blue-500" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {currentView === 'detail' && selectedIndicator && selectedMeta && (
              <div className="max-w-6xl mx-auto space-y-6 animate-in slide-in-from-right-8 duration-500">
                <div className="bg-white p-5 sm:p-6 rounded-[2rem] shadow-sm border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <button
                        onClick={() => setCurrentView('overview')}
                        className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
                      >
                        <ChevronRight className="w-5 h-5 rotate-180" />
                      </button>
                      <h2 className="text-xl font-bold text-slate-800">{selectedIndicator}</h2>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 pl-9">
                      <span className="bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                        運算: {selectedMeta.type === 'avg' ? '平均值' : '加總值'}
                      </span>
                      <span className="bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 flex items-center gap-1">
                        方向：
                        {selectedMeta.isNegative ? (
                          <span className="text-rose-600 font-medium">越低越好</span>
                        ) : (
                          <span className="text-emerald-600 font-medium">越高越好</span>
                        )}
                      </span>
                      <span className="bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                        單位: {selectedMeta.unit}
                      </span>
                    </div>
                  </div>

                  <div className="flex bg-slate-100 p-1 rounded-xl self-start lg:self-auto">
                    <button
                      onClick={() => setTimeDimension('month')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        timeDimension === 'month'
                          ? 'bg-white text-blue-700 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      依月份展開
                    </button>
                    <button
                      onClick={() => setTimeDimension('quarter')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        timeDimension === 'quarter'
                          ? 'bg-white text-blue-700 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      依季度聚合
                    </button>
                  </div>
                </div>

                <div className="bg-white p-5 sm:p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-200">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                    <h3 className="text-slate-700 font-semibold flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-blue-500" />
                      趨勢圖表
                    </h3>
                    <div className="text-xs text-slate-400">
                      手機可左右滑動圖表，查看完整 X 軸資料
                    </div>
                  </div>

                  <div className="w-full overflow-x-auto pb-2">
                    <div style={{ minWidth: `${chartMinWidth}px`, height: chartHeight }}>
                      {detailChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          {selectedMeta.type === 'avg' ? (
                            <LineChart
                              data={detailChartData}
                              margin={{ top: 24, right: 20, left: 0, bottom: 24 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                              <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                interval={0}
                                height={xAxisHeight}
                                tick={(props) => <CustomXAxisTick {...props} isMobile={isMobile} />}
                              />
                              <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748b', fontSize: isMobile ? 10 : 12 }}
                                dx={-10}
                                domain={detailYAxisDomain}
                                tickCount={6}
                              />
                              <Tooltip
                                contentStyle={{
                                  borderRadius: '1rem',
                                  border: 'none',
                                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                }}
                                labelStyle={{
                                  fontWeight: 'bold',
                                  color: '#1e293b',
                                  marginBottom: '8px',
                                }}
                                formatter={(value, name) => [
                                  formatDisplayValue(
                                    value,
                                    selectedMeta.unit,
                                    name === '目標值' ? 'avg' : selectedMeta.type
                                  ),
                                  name,
                                ]}
                              />
                              <Legend iconType="circle" wrapperStyle={{ paddingTop: '12px' }} />

                              <Line
                                type="monotone"
                                dataKey="target"
                                name="目標值"
                                stroke="#94a3b8"
                                strokeWidth={2}
                                strokeDasharray="6 6"
                                dot={false}
                                activeDot={false}
                              />
                              <Line
                                type="monotone"
                                dataKey="value"
                                name="監測結果"
                                stroke="#2563eb"
                                strokeWidth={3}
                                dot={{ r: isMobile ? 3 : 4, strokeWidth: 2 }}
                                activeDot={{ r: isMobile ? 5 : 6, strokeWidth: 0 }}
                                connectNulls
                              >
                                <LabelList
                                  dataKey="value"
                                  position="top"
                                  formatter={(value) =>
                                    value === null || value === undefined
                                      ? ''
                                      : formatDisplayValue(value, selectedMeta.unit, 'avg')
                                  }
                                  style={{
                                    fill: '#1e293b',
                                    fontSize: isMobile ? 10 : 12,
                                    fontWeight: 600,
                                  }}
                                />
                              </Line>
                            </LineChart>
                          ) : (
                            <BarChart
                              data={detailChartData}
                              margin={{ top: 24, right: 20, left: 0, bottom: 24 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                              <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                interval={0}
                                height={xAxisHeight}
                                tick={(props) => <CustomXAxisTick {...props} isMobile={isMobile} />}
                              />
                              <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748b', fontSize: isMobile ? 10 : 12 }}
                                dx={-10}
                                domain={detailYAxisDomain}
                                tickCount={6}
                              />
                              <Tooltip
                                contentStyle={{
                                  borderRadius: '1rem',
                                  border: 'none',
                                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                }}
                                cursor={{ fill: '#f1f5f9' }}
                                formatter={(value, name, props) => {
                                  if (name === '監測結果') {
                                    return [formatDisplayValue(value, selectedMeta.unit, 'sum'), name];
                                  }
                                  return [
                                    formatDisplayValue(props?.payload?.target, selectedMeta.unit, 'sum'),
                                    '目標值',
                                  ];
                                }}
                              />
                              <Legend iconType="circle" wrapperStyle={{ paddingTop: '12px' }} />

                              <Bar
                                dataKey="value"
                                name="監測結果"
                                radius={[4, 4, 0, 0]}
                                maxBarSize={isMobile ? 32 : 52}
                              >
                                <LabelList
                                  dataKey="value"
                                  position="top"
                                  formatter={(value) =>
                                    value === null || value === undefined
                                      ? ''
                                      : formatDisplayValue(value, selectedMeta.unit, 'sum')
                                  }
                                  style={{
                                    fill: '#1e293b',
                                    fontSize: isMobile ? 10 : 12,
                                    fontWeight: 600,
                                  }}
                                />
                                {detailChartData.map((entry, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={entry.isSuccess ? '#10b981' : '#f43f5e'}
                                  />
                                ))}
                              </Bar>
                            </BarChart>
                          )}
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-slate-400">
                          沒有符合篩選條件的資料可供顯示
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-[2rem] p-5 sm:p-6 md:p-8 flex gap-4 items-start shadow-sm">
                  <div className="bg-blue-100 p-3 rounded-xl shrink-0 mt-1">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-blue-900 mb-2">最新檢討與改善回饋</h3>
                    <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{latestReview}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
