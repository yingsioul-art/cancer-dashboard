'use client';

import React, { useEffect, useMemo, useState } from 'react';
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
  ChevronRight,
  FileText,
  ListFilter,
  Loader2,
  Type,
  Gauge,
  Activity,
  ArrowUpCircle,
  ArrowDownCircle,
} from 'lucide-react';

const NTUH_LOGO = '/ntuh-logo.png';

const API_URL =
  'https://script.google.com/macros/s/AKfycbzjJgyMDSWmNzzowWRuxY5O2OrIWnIRXkpc4gMTUPVjGN49_Fi_c4RxC5k8AbjkRSY/exec';

const FONT_SCALE_OPTIONS = [
  { key: 'sm', label: '小', value: 0.92 },
  { key: 'md', label: '中', value: 1 },
  { key: 'lg', label: '大', value: 1.12 },
  { key: 'xl', label: '特大', value: 1.24 },
];

const QUARTER_OPTIONS = [
  { key: 'Q1', label: '第1季', months: [1, 2, 3] },
  { key: 'Q2', label: '第2季', months: [4, 5, 6] },
  { key: 'Q3', label: '第3季', months: [7, 8, 9] },
  { key: 'Q4', label: '第4季', months: [10, 11, 12] },
];

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => ({
  value: index + 1,
  label: `${index + 1}月`,
}));

const INDICATOR_ALIASES = {
  '護理師對PortA管路照護完成率': '護理師對Port-A管路照護完成率',
  '護理師對PortA管路照護認知率': '護理師對Port-A管路照護認知率',
  '護理師對Port－A管路照護完成率': '護理師對Port-A管路照護完成率',
  '護理師對Port－A管路照護認知率': '護理師對Port-A管路照護認知率',
  '針劑型化療藥品溢灑發生件數': '針劑型化療藥品溢灑件數',
};

const DEFAULT_INDICATOR_META = {
  '護理師對Port-A管路照護完成率': { type: 'avg', isNegative: false, unit: '%' },
  '護理師對Port-A管路照護認知率': { type: 'avg', isNegative: false, unit: '%' },

  '口腔黏膜炎病人自我照顧完成率': { type: 'avg', isNegative: false, unit: '%' },
  '口腔黏膜炎病人護理指導完成率': { type: 'avg', isNegative: false, unit: '%' },
  '化療病人口腔黏膜炎G2以上盛行率': { type: 'avg', isNegative: true, unit: '%' },
  '化療病人口腔黏膜炎G2以上發生率': { type: 'avg', isNegative: true, unit: '%' },
  '化療病人口腔黏膜炎盛行率': { type: 'avg', isNegative: true, unit: '%' },
  '化療病人口腔黏膜炎發生率': { type: 'avg', isNegative: true, unit: '%' },
  '癌症病人口腔黏膜炎G2以上盛行率': { type: 'avg', isNegative: true, unit: '%' },
  '癌症病人口腔黏膜炎盛行率': { type: 'avg', isNegative: true, unit: '%' },

  '化療藥品外滲處理過程完成率': { type: 'avg', isNegative: false, unit: '%' },
  '化療藥品外滲發生處理完成率': { type: 'avg', isNegative: false, unit: '%' },
  '非起疱性化療藥品外滲發生件數': { type: 'sum', isNegative: true, unit: '件' },
  '起疱性化療藥品外滲發生件數': { type: 'sum', isNegative: true, unit: '件' },

  '化學治療靜脈給藥過程完成率': { type: 'avg', isNegative: false, unit: '%' },
  '針劑型化療給藥護理紀錄完整率': { type: 'avg', isNegative: false, unit: '%' },
  '針劑型化療藥品給藥異常件數': { type: 'sum', isNegative: true, unit: '件' },
  '單位化療藥品儲存與環境維護完整率': { type: 'avg', isNegative: false, unit: '%' },
  '癌症治療副作用處置紀錄完整率': { type: 'avg', isNegative: false, unit: '%' },
  '護理師處理化療給藥自我安全防護完整率': { type: 'avg', isNegative: false, unit: '%' },

  '溢灑包內容物完整率': { type: 'avg', isNegative: false, unit: '%' },
  '針劑型化療藥品溢灑件數': { type: 'sum', isNegative: true, unit: '件' },

  '癌症病人情緒壓力主要問題評估完成率': { type: 'avg', isNegative: false, unit: '%' },

  '中重度疼痛控制不良率_內科組': { type: 'avg', isNegative: true, unit: '%' },
  '中重度疼痛控制不良率_外科組': { type: 'avg', isNegative: true, unit: '%' },
  '中重度疼痛控制不良率_血液腫瘤組': { type: 'avg', isNegative: true, unit: '%' },
  '中重度疼痛控制不良率_兒科組': { type: 'avg', isNegative: true, unit: '%' },
  '中重度疼痛控制不良率_腫瘤專科組': { type: 'avg', isNegative: true, unit: '%' },
  '使用麻醉性止痛藥疼痛評估與紀錄完整率': { type: 'avg', isNegative: false, unit: '%' },

  '嗜中性白血球低下照護完成率': { type: 'avg', isNegative: false, unit: '%' },
  '嗜中性白血球低下護理指導完成率': { type: 'avg', isNegative: false, unit: '%' },
  '護理師對嗜中性白血球低下照護完成率': { type: 'avg', isNegative: false, unit: '%' },
  '護理師對嗜中性白血球低下照護認知率': { type: 'avg', isNegative: false, unit: '%' },
};

const CATEGORY_DEFINITIONS = {
  'Port-A照護': [
    '護理師對Port-A管路照護完成率',
    '護理師對Port-A管路照護認知率',
  ],
  '口腔粘膜炎照護': [
    '口腔黏膜炎病人自我照顧完成率',
    '口腔黏膜炎病人護理指導完成率',
    '化療病人口腔黏膜炎G2以上盛行率',
    '化療病人口腔黏膜炎G2以上發生率',
    '化療病人口腔黏膜炎盛行率',
    '化療病人口腔黏膜炎發生率',
    '癌症病人口腔黏膜炎G2以上盛行率',
    '癌症病人口腔黏膜炎盛行率',
  ],
  '化療外滲': [
    '化療藥品外滲處理過程完成率',
    '化療藥品外滲發生處理完成率',
    '非起疱性化療藥品外滲發生件數',
    '起疱性化療藥品外滲發生件數',
  ],
  '化療給藥安全': [
    '化學治療靜脈給藥過程完成率',
    '針劑型化療給藥護理紀錄完整率',
    '針劑型化療藥品給藥異常件數',
    '單位化療藥品儲存與環境維護完整率',
    '癌症治療副作用處置紀錄完整率',
    '護理師處理化療給藥自我安全防護完整率',
  ],
  '化療溢灑': ['溢灑包內容物完整率', '針劑型化療藥品溢灑件數'],
  '心理照護': ['癌症病人情緒壓力主要問題評估完成率'],
  '疼痛照護': [
    '中重度疼痛控制不良率_內科組',
    '中重度疼痛控制不良率_外科組',
    '中重度疼痛控制不良率_血液腫瘤組',
    '中重度疼痛控制不良率_兒科組',
    '中重度疼痛控制不良率_腫瘤專科組',
    '使用麻醉性止痛藥疼痛評估與紀錄完整率',
  ],
  '嗜中性白血球低下照護': [
    '嗜中性白血球低下照護完成率',
    '嗜中性白血球低下護理指導完成率',
    '護理師對嗜中性白血球低下照護完成率',
    '護理師對嗜中性白血球低下照護認知率',
  ],
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

const strokeCollator = (() => {
  try {
    return new Intl.Collator('zh-Hant-u-co-stroke');
  } catch {
    return new Intl.Collator('zh-Hant');
  }
})();

const sortByStroke = (list) => [...list].sort((a, b) => strokeCollator.compare(a, b));

const isValidNumberValue = (value) =>
  value !== null && value !== undefined && !Number.isNaN(value);

const normalizeIndicatorName = (value) => {
  const normalized = String(value || '').trim();
  return INDICATOR_ALIASES[normalized] || normalized;
};

const parseMaybeNumber = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const cleaned = String(value).replace(/[% ,]/g, '').trim();
  if (!cleaned) return null;
  const num = Number(cleaned);
  return Number.isNaN(num) ? null : num;
};

const getSelectedMonths = (selectedQuarter, selectedMonth) => {
  if (selectedMonth) return [selectedMonth];
  if (selectedQuarter) {
    return QUARTER_OPTIONS.find((item) => item.key === selectedQuarter)?.months || [];
  }
  return Array.from({ length: 12 }, (_, index) => index + 1);
};

const getPeriodLabel = (selectedQuarter, selectedMonth) => {
  if (selectedMonth) return `${selectedMonth}月同期比較`;
  if (selectedQuarter) {
    return `${QUARTER_OPTIONS.find((item) => item.key === selectedQuarter)?.label || selectedQuarter}同期比較`;
  }
  return '年度比較';
};

const getPeriodValueLabel = (selectedQuarter, selectedMonth) => {
  if (selectedMonth) return `${selectedMonth}月監測結果`;
  if (selectedQuarter) {
    return `${QUARTER_OPTIONS.find((item) => item.key === selectedQuarter)?.label || selectedQuarter}監測結果`;
  }
  return '年度監測結果';
};

const getPeriodValues = (monthly, selectedMonths) => {
  if (!Array.isArray(monthly)) return [];
  return selectedMonths
    .map((month) => monthly[month - 1])
    .filter((value) => isValidNumberValue(value));
};

const formatDisplayValue = (value, unit, type) => {
  if (value === null || value === undefined) return '無資料';
  if (type === 'avg' || unit === '%') return `${Number(value).toFixed(1)}${unit}`;
  return `${Number(value)}${unit}`;
};

const calculateAggregate = (values, type) => {
  const validValues = values.filter(isValidNumberValue);
  if (validValues.length === 0) return null;
  const sum = validValues.reduce((a, b) => a + b, 0);
  if (type === 'sum') return sum;
  return +(sum / validValues.length).toFixed(1);
};

const checkIsSuccess = (value, target, isNegative) => {
  if (value === null || value === undefined) return null;
  return isNegative ? value <= target : value >= target;
};

const getDynamicYAxisDomain = (chartData, unit) => {
  const values = chartData
    .flatMap((item) => [item.value, item.target])
    .filter(isValidNumberValue);

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

const rowHasMonitoringResult = (row, selectedMonths = null) => {
  if (!row || !Array.isArray(row.monthly)) return false;
  const values =
    Array.isArray(selectedMonths) && selectedMonths.length
      ? selectedMonths.map((month) => row.monthly[month - 1])
      : row.monthly;
  return values.some((value) => isValidNumberValue(value));
};

const inferIndicatorMetaFromName = (indicatorName) => {
  const name = String(indicatorName || '');

  if (name.includes('件數')) {
    return { type: 'sum', isNegative: true, unit: '件' };
  }

  if (
    name.includes('發生率') ||
    name.includes('盛行率') ||
    name.includes('控制不良率')
  ) {
    return { type: 'avg', isNegative: true, unit: '%' };
  }

  if (
    name.includes('完成率') ||
    name.includes('認知率') ||
    name.includes('完整率') ||
    name.includes('評估完成率')
  ) {
    return { type: 'avg', isNegative: false, unit: '%' };
  }

  return { type: 'avg', isNegative: false, unit: '%' };
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
      indicator: normalizeIndicatorName(
        row.indicator ?? row['品質指標'] ?? row.Indicator ?? ''
      ),
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
    payload?.indicatorMeta && typeof payload.indicatorMeta === 'object'
      ? payload.indicatorMeta
      : {};

  const normalizedApiMeta = Object.entries(apiMeta).reduce((acc, [key, value]) => {
    acc[normalizeIndicatorName(key)] = value;
    return acc;
  }, {});

  const mergedMeta = { ...DEFAULT_INDICATOR_META, ...normalizedApiMeta };

  rows.forEach((row) => {
    if (!mergedMeta[row.indicator]) {
      mergedMeta[row.indicator] = inferIndicatorMetaFromName(row.indicator);
    }
  });

  return mergedMeta;
};

const parsePayloadText = (text) => {
  const trimmed = String(text || '').trim();
  if (!trimmed) return [];

  try {
    return JSON.parse(trimmed);
  } catch {
    // continue
  }

  const match = trimmed.match(/^[^(]+\(([\s\S]*)\)\s*;?\s*$/);
  if (match?.[1]) return JSON.parse(match[1]);
  throw new Error('API 回傳格式不是 JSON / JSONP');
};

const loadJsonp = (url) =>
  new Promise((resolve, reject) => {
    const callbackName = `dashboardJsonp_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const script = document.createElement('script');
    let timeoutId = null;

    const cleanup = () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      try {
        delete window[callbackName];
      } catch {
        window[callbackName] = undefined;
      }
      if (script.parentNode) script.parentNode.removeChild(script);
    };

    window[callbackName] = (data) => {
      cleanup();
      resolve(data);
    };

    script.src = `${url}${url.includes('?') ? '&' : '?'}callback=${callbackName}`;
    script.async = true;
    script.onerror = () => {
      cleanup();
      reject(new Error('JSONP 載入失敗'));
    };

    timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error('JSONP 連線逾時'));
    }, 12000);

    document.body.appendChild(script);
  });

const loadRemotePayload = async (url) => {
  try {
    const response = await fetch(url, { method: 'GET' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    return parsePayloadText(text);
  } catch {
    return loadJsonp(url);
  }
};

const formatMonitoringYears = (years) => {
  if (!years || years.length === 0) return '無監測年度';
  return years.length === 1 ? `${years[0]}年度` : `${years.join('、')}年度`;
};

function polarToCartesian(cx, cy, r, angle) {
  const rad = ((angle - 90) * Math.PI) / 180.0;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

function GaugeChart({ value }) {
  const safeValue = Math.max(0, Math.min(100, value || 0));
  const size = 260;
  const cx = 130;
  const cy = 130;
  const r = 88;
  const startAngle = 180;
  const endAngle = 180 + (safeValue / 100) * 180;

  return (
    <div className="flex flex-col items-center justify-center">
      <svg width={size} height={170} viewBox="0 0 260 170">
        <path
          d={describeArc(cx, cy, r, 180, 360)}
          fill="none"
          stroke="rgba(255,255,255,0.22)"
          strokeWidth="20"
          strokeLinecap="round"
        />
        <path
          d={describeArc(cx, cy, r, startAngle, endAngle)}
          fill="none"
          stroke="white"
          strokeWidth="20"
          strokeLinecap="round"
        />
        <text x="130" y="112" textAnchor="middle" fill="white" fontSize="36" fontWeight="700">
          {safeValue}%
        </text>
      </svg>
    </div>
  );
}

function SpeedometerChart({ value }) {
  const safeValue = Math.max(0, Math.min(100, value || 0));
  const angle = -90 + (safeValue / 100) * 180;
  const pointer = polarToCartesian(130, 130, 72, angle + 90);

  return (
    <div className="flex flex-col items-center justify-center">
      <svg width="260" height="170" viewBox="0 0 260 170">
        <path d={describeArc(130, 130, 88, 180, 240)} fill="none" stroke="#ef4444" strokeWidth="20" strokeLinecap="round" />
        <path d={describeArc(130, 130, 88, 240, 300)} fill="none" stroke="#f59e0b" strokeWidth="20" strokeLinecap="round" />
        <path d={describeArc(130, 130, 88, 300, 360)} fill="none" stroke="#22c55e" strokeWidth="20" strokeLinecap="round" />
        <line x1="130" y1="130" x2={pointer.x} y2={pointer.y} stroke="white" strokeWidth="5" strokeLinecap="round" />
        <circle cx="130" cy="130" r="8" fill="white" />
        <text x="130" y="112" textAnchor="middle" fill="white" fontSize="34" fontWeight="700">
          {safeValue}%
        </text>
      </svg>
    </div>
  );
}

function SegmentedMiniGaugeChart({ progress, hasData }) {
  if (!hasData) {
    return <div className="flex h-[128px] items-center justify-center text-sm text-slate-400">無資料</div>;
  }

  const safeValue = Math.max(0, Math.min(100, progress || 0));
  const cx = 90;
  const cy = 92;
  const r = 54;
  const pointerAngle = 180 + (safeValue / 100) * 180;
  const pointer = polarToCartesian(cx, cy, r - 6, pointerAngle);

  return (
    <div className="flex items-center justify-center">
      <svg width="180" height="128" viewBox="0 0 180 128">
        <path d={describeArc(cx, cy, r, 180, 286.2)} fill="none" stroke="#ef4444" strokeWidth="14" strokeLinecap="round" />
        <path d={describeArc(cx, cy, r, 288, 331.2)} fill="none" stroke="#f59e0b" strokeWidth="14" strokeLinecap="round" />
        <path d={describeArc(cx, cy, r, 333, 360)} fill="none" stroke="#22c55e" strokeWidth="14" strokeLinecap="round" />
        <line x1={cx} y1={cy} x2={pointer.x} y2={pointer.y} stroke="#0f172a" strokeWidth="4" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="5.5" fill="#0f172a" />
        <text x="90" y="78" textAnchor="middle" fill="#0f172a" fontSize="22" fontWeight="700">
          {safeValue}%
        </text>
      </svg>
    </div>
  );
}

const getIndicatorGaugeProgress = (value, target, isNegative) => {
  if (!isValidNumberValue(value) || !isValidNumberValue(target) || target === 0) return null;

  if (isNegative) {
    const progress = (target / Math.max(value, 0.0001)) * 100;
    return Math.max(0, Math.min(100, Math.round(progress)));
  }

  const progress = (value / target) * 100;
  return Math.max(0, Math.min(100, Math.round(progress)));
};

export default function App() {
  const [indicatorMeta, setIndicatorMeta] = useState(DEFAULT_INDICATOR_META);
  const [rawData, setRawData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [apiStatus, setApiStatus] = useState('loading');
  const [apiMessage, setApiMessage] = useState('正在載入線上資料...');

  const [selectedYears, setSelectedYears] = useState([]);
  const [selectedQuarter, setSelectedQuarter] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [currentView, setCurrentView] = useState('overview');
  const [selectedIndicator, setSelectedIndicator] = useState(null);
  const [fontScaleKey, setFontScaleKey] = useState('md');
  const [gaugeMode, setGaugeMode] = useState('gauge');

  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1440
  );

  const fontScale =
    FONT_SCALE_OPTIONS.find((item) => item.key === fontScaleKey)?.value ?? 1;

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setApiStatus('loading');
        setApiMessage('正在載入線上資料...');

        const payload = await loadRemotePayload(API_URL);
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
        }
      } catch (err) {
        console.error('Load data error:', err);
        setError('無法取得資料，請確認 Apps Script 是否已重新部署，且網址可正常開啟。');
        setApiStatus('error');
        setApiMessage(err?.message || '無法載入資料');
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
      return filtered.length ? filtered : availableYearsList;
    });
  }, [availableYearsList]);

  const effectiveYears = selectedYears.length ? selectedYears : availableYearsList;
  const selectedMonths = useMemo(
    () => getSelectedMonths(selectedQuarter, selectedMonth),
    [selectedQuarter, selectedMonth]
  );
  const periodLabel = useMemo(
    () => getPeriodLabel(selectedQuarter, selectedMonth),
    [selectedQuarter, selectedMonth]
  );
  const periodValueLabel = useMemo(
    () => getPeriodValueLabel(selectedQuarter, selectedMonth),
    [selectedQuarter, selectedMonth]
  );

  const availableIndicatorNames = useMemo(() => {
    const indicators = rawData
      .filter(
        (row) => effectiveYears.includes(row.year) && rowHasMonitoringResult(row, selectedMonths)
      )
      .map((row) => row.indicator);

    return sortByStroke([...new Set(indicators)]);
  }, [rawData, effectiveYears, selectedMonths]);

  useEffect(() => {
    if (!selectedIndicator) return;
    if (!availableIndicatorNames.includes(selectedIndicator)) {
      setSelectedIndicator(null);
      setCurrentView('overview');
    }
  }, [availableIndicatorNames, selectedIndicator]);

  const availableIndicatorGroups = useMemo(() => {
    const grouped = {};
    const uncategorized = [];

    availableIndicatorNames.forEach((indicator) => {
      const category = INDICATOR_CATEGORY_MAP[indicator];
      if (!category) {
        uncategorized.push(indicator);
        return;
      }
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(indicator);
    });

    const orderedGroups = Object.keys(CATEGORY_DEFINITIONS)
      .map((category) => ({
        category,
        indicators: sortByStroke(grouped[category] || []),
      }))
      .filter((group) => group.indicators.length > 0);

    if (uncategorized.length > 0) {
      orderedGroups.push({
        category: '其他未分類',
        indicators: sortByStroke(uncategorized),
      });
    }

    return orderedGroups;
  }, [availableIndicatorNames]);

  const overviewData = useMemo(() => {
    if (!rawData.length) return [];

    return availableIndicatorNames.map((indicatorName) => {
      const meta = indicatorMeta[indicatorName] || inferIndicatorMetaFromName(indicatorName);

      const indicatorRecords = rawData
        .filter(
          (d) =>
            d.indicator === indicatorName &&
            effectiveYears.includes(d.year) &&
            rowHasMonitoringResult(d, selectedMonths)
        )
        .sort((a, b) => Number(a.year) - Number(b.year));

      let allRelevantValues = [];
      let latestTarget = 0;

      indicatorRecords.forEach((record) => {
        const periodValues = getPeriodValues(record.monthly, selectedMonths);
        allRelevantValues = [...allRelevantValues, ...periodValues];
        latestTarget = record.target;
      });

      const monitoringYears = [...new Set(indicatorRecords.map((record) => record.year))].sort(
        (a, b) => Number(a) - Number(b)
      );

      const calculatedValue = calculateAggregate(allRelevantValues, meta.type);
      const isSuccess = checkIsSuccess(calculatedValue, latestTarget, meta.isNegative);
      const gaugeProgress = getIndicatorGaugeProgress(calculatedValue, latestTarget, meta.isNegative);

      return {
        name: indicatorName,
        meta,
        value: calculatedValue,
        target: latestTarget,
        isSuccess,
        category: INDICATOR_CATEGORY_MAP[indicatorName] || '其他未分類',
        monitoringYears,
        gaugeProgress,
      };
    });
  }, [rawData, indicatorMeta, availableIndicatorNames, effectiveYears, selectedMonths]);

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
    const meta = indicatorMeta[selectedIndicator] || inferIndicatorMetaFromName(selectedIndicator);

    return rawData
      .filter(
        (d) =>
          d.indicator === selectedIndicator &&
          effectiveYears.includes(d.year) &&
          rowHasMonitoringResult(d, selectedMonths)
      )
      .sort((a, b) => Number(a.year) - Number(b.year))
      .map((record) => {
        const value = calculateAggregate(getPeriodValues(record.monthly, selectedMonths), meta.type);
        if (value === null) return null;
        return {
          name: `${record.year}年`,
          year: record.year,
          value,
          target: record.target,
          isSuccess: checkIsSuccess(value, record.target, meta.isNegative),
        };
      })
      .filter(Boolean);
  }, [rawData, indicatorMeta, selectedIndicator, effectiveYears, selectedMonths]);

  const detailYAxisDomain = useMemo(() => {
    if (!selectedIndicator) return ['auto', 'auto'];
    const unit =
      (indicatorMeta[selectedIndicator] || inferIndicatorMetaFromName(selectedIndicator)).unit;
    return getDynamicYAxisDomain(detailChartData, unit);
  }, [detailChartData, indicatorMeta, selectedIndicator]);

  const selectedIndicatorReviews = useMemo(() => {
    if (!selectedIndicator || effectiveYears.length === 0 || !rawData.length) return [];

    return [...effectiveYears]
      .sort((a, b) => Number(a) - Number(b))
      .map((year) => {
        const record = rawData.find(
          (d) => d.indicator === selectedIndicator && d.year === year
        );
        return {
          year,
          review: record?.review?.trim() || '本年度暫無 review 資料',
          hasData: Boolean(record?.review?.trim()),
        };
      });
  }, [rawData, selectedIndicator, effectiveYears]);

  const isMobile = viewportWidth < 640;
  const isTablet = viewportWidth >= 640 && viewportWidth < 1024;
  const chartHeight = isMobile ? 340 : isTablet ? 400 : 480;
  const xAxisHeight = 48;

  const selectedMeta = selectedIndicator
    ? indicatorMeta[selectedIndicator] || inferIndicatorMetaFromName(selectedIndicator)
    : null;

  const chartPointWidth = isMobile ? 110 : isTablet ? 100 : 88;
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

  const handleQuarterSelect = (quarterKey) => {
    setSelectedQuarter((prev) => (prev === quarterKey ? null : quarterKey));
    setSelectedMonth(null);
  };

  const handleMonthSelect = (month) => {
    setSelectedMonth((prev) => (prev === month ? null : month));
    setSelectedQuarter(null);
  };

  const cycleFontScale = () => {
    const currentIndex = FONT_SCALE_OPTIONS.findIndex((item) => item.key === fontScaleKey);
    const nextIndex = currentIndex === FONT_SCALE_OPTIONS.length - 1 ? 0 : currentIndex + 1;
    setFontScaleKey(FONT_SCALE_OPTIONS[nextIndex].key);
  };

  const handleIndicatorJump = (indicatorName) => {
    setSelectedIndicator(indicatorName);
    setCurrentView('detail');
  };

  const rootFontStyle = {
    fontFamily: '"Microsoft JhengHei", "PingFang TC", sans-serif',
    fontWeight: 700,
    fontSize: `${fontScale}rem`,
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50" style={rootFontStyle}>
        <div className="flex flex-col items-center gap-4 text-blue-600">
          <Loader2 className="h-10 w-10 animate-spin" />
          <p className="tracking-wide text-slate-600">載入雲端資料庫中，請稍候...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4" style={rootFontStyle}>
        <div className="flex max-w-md flex-col items-center gap-4 rounded-2xl border border-rose-100 bg-rose-50 p-8 text-center text-rose-500 shadow-sm">
          <AlertCircle className="h-12 w-12" />
          <h2 className="text-xl">資料連線失敗</h2>
          <p className="text-sm text-slate-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-xl bg-rose-600 px-6 py-2.5 text-white transition-colors hover:bg-rose-700"
          >
            重新載入
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800" style={rootFontStyle}>
      <div className="flex min-h-screen flex-col xl:flex-row">
        <aside className="z-10 w-full border-b border-slate-200 bg-white shadow-sm xl:w-80 xl:border-b-0 xl:border-r">
          <div className="border-b border-slate-100 p-6">
            <div className="mb-3 flex items-center">
              <div className="flex h-20 w-52 items-center justify-center rounded-xl bg-white">
                <img
                  src={NTUH_LOGO}
                  alt="台大醫院"
                  className="max-h-full max-w-full object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            </div>
            <div className="text-xl text-slate-800">癌症護理品管指標</div>
            <p className="mt-1 text-xs text-slate-400">品質指標監測儀表板</p>
          </div>

          <div className="space-y-8 p-6 xl:h-[calc(100vh-155px)] xl:overflow-y-auto">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
              {apiStatus === 'loading' && <span className="text-slate-600">正在載入線上資料...</span>}
              {apiStatus === 'success' && <span className="text-emerald-700">{apiMessage}</span>}
              {apiStatus === 'empty' && <span className="text-amber-700">{apiMessage}</span>}
              {apiStatus === 'error' && <span className="text-rose-700">{apiMessage}</span>}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 text-sm text-slate-700">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={cycleFontScale}
                    className="rounded-lg p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-blue-700"
                    title="點一下切換字體大小"
                  >
                    <Type className="h-4 w-4" />
                  </button>
                  <span>字體大小</span>
                </div>
                <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-500">
                  目前：{FONT_SCALE_OPTIONS.find((item) => item.key === fontScaleKey)?.label}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {FONT_SCALE_OPTIONS.map((option) => (
                  <button
                    key={option.key}
                    onClick={() => setFontScaleKey(option.key)}
                    className={`rounded-xl border px-3 py-2 text-sm transition-all ${
                      fontScaleKey === option.key
                        ? 'border-blue-200 bg-blue-50 text-blue-700 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <CalendarDays className="h-4 w-4 text-slate-400" />
                <span>年度篩選</span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-2">
                {availableYearsList.length > 0 ? (
                  availableYearsList.map((year) => (
                    <button
                      key={year}
                      onClick={() => toggleYear(year)}
                      className={`rounded-xl border px-3 py-2 text-sm transition-all ${
                        effectiveYears.includes(year)
                          ? 'border-blue-200 bg-blue-50 text-blue-700 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {year}
                    </button>
                  ))
                ) : (
                  <div className="col-span-2 text-sm text-slate-400">無年份資料</div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <CalendarDays className="h-4 w-4 text-slate-400" />
                <span>季別同期比較</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {QUARTER_OPTIONS.map((option) => (
                  <button
                    key={option.key}
                    onClick={() => handleQuarterSelect(option.key)}
                    className={`rounded-xl border px-3 py-2 text-sm transition-all ${
                      selectedQuarter === option.key
                        ? 'border-indigo-200 bg-indigo-50 text-indigo-700 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <CalendarDays className="h-4 w-4 text-slate-400" />
                <span>月份同期比較</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {MONTH_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleMonthSelect(option.value)}
                    className={`rounded-xl border px-3 py-2 text-sm transition-all ${
                      selectedMonth === option.value
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedQuarter(null);
                  setSelectedMonth(null);
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-100"
              >
                清除季別 / 月份，回到年度比較
              </button>
            </div>

            <div className="space-y-4 border-t border-slate-100 pt-4">
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <ListFilter className="h-4 w-4 text-slate-400" />
                <span>快速跳轉指標</span>
              </div>

              <div className="relative">
                <select
                  value={selectedIndicator || ''}
                  onChange={(e) => {
                    if (e.target.value) handleIndicatorJump(e.target.value);
                  }}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-8 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              </div>
            </div>
          </div>
        </aside>

        <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="z-10 shrink-0 border-b border-slate-200 bg-white px-4 py-5 shadow-sm sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="text-2xl text-slate-800">
                  {currentView === 'overview' ? '總覽' : '單一指標'}
                </h1>
                <p className="mt-1 text-sm leading-relaxed text-slate-500">
                  比較年度：{effectiveYears.length > 0 ? effectiveYears.join('、') : '未選擇年份'}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-slate-500">比較基準：{periodLabel}</p>
              </div>

              <div className="flex self-start rounded-xl border border-slate-200 bg-slate-100 p-1 shadow-inner lg:self-auto">
                <button
                  onClick={() => {
                    setCurrentView('overview');
                    setSelectedIndicator(null);
                  }}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm transition-all ${
                    currentView === 'overview'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-700'
                  }`}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  總覽視圖
                </button>
                <button
                  onClick={() => selectedIndicator && setCurrentView('detail')}
                  disabled={!selectedIndicator}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm transition-all ${
                    currentView === 'detail'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50'
                  }`}
                >
                  <TrendingUp className="h-4 w-4" />
                  分析視圖
                </button>
              </div>
            </div>
          </header>

          <div className="relative flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
            {currentView === 'overview' && (
              <div className="mx-auto max-w-7xl space-y-8">
                <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-white shadow-xl sm:p-8">
                  <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="max-w-xl">
                      <h2 className="mb-2 text-lg text-blue-100">所選條件整體達標率</h2>
                      <div className="mb-2 text-sm text-blue-200">比較基準：{periodLabel}</div>
                      <div className="mb-4 text-sm text-blue-200">
                        ({overviewData.filter((d) => d.isSuccess).length} /{' '}
                        {overviewData.filter((d) => d.value !== null).length} 達標指標)
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setGaugeMode('gauge')}
                          className={`rounded-xl px-4 py-2 text-sm transition-all ${
                            gaugeMode === 'gauge'
                              ? 'bg-white text-blue-700 shadow-sm'
                              : 'bg-white/15 text-white hover:bg-white/20'
                          }`}
                        >
                          <span className="inline-flex items-center gap-2">
                            <Gauge className="h-4 w-4" />
                            儀表盤
                          </span>
                        </button>
                        <button
                          onClick={() => setGaugeMode('speedometer')}
                          className={`rounded-xl px-4 py-2 text-sm transition-all ${
                            gaugeMode === 'speedometer'
                              ? 'bg-white text-blue-700 shadow-sm'
                              : 'bg-white/15 text-white hover:bg-white/20'
                          }`}
                        >
                          <span className="inline-flex items-center gap-2">
                            <Activity className="h-4 w-4" />
                            速度表 / 儀表圖
                          </span>
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-center">
                      {gaugeMode === 'gauge' ? (
                        <GaugeChart value={overallSuccessRate} />
                      ) : (
                        <SpeedometerChart value={overallSuccessRate} />
                      )}
                    </div>
                  </div>
                </div>

                {groupedOverviewData.map((group) => (
                  <div key={group.category}>
                    <h3 className="mb-4 flex items-center gap-2 text-lg text-slate-800">
                      <FileText className="h-5 w-5 text-slate-400" />
                      {group.category}
                    </h3>

                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                      {group.items.map((item) => (
                        <div
                          key={item.name}
                          onClick={() => handleIndicatorJump(item.name)}
                          className="group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-blue-300 hover:shadow-lg"
                        >
                          <div
                            className={`absolute left-0 top-0 h-1 w-full ${
                              item.isSuccess
                                ? 'bg-emerald-500'
                                : item.value === null
                                ? 'bg-slate-200'
                                : 'bg-rose-500'
                            }`}
                          />

                          <div className="mb-3 mt-1 flex items-start justify-between gap-3">
                            <div
                              className={`rounded-xl p-2 ${
                                item.isSuccess
                                  ? 'bg-emerald-50 text-emerald-600'
                                  : item.value === null
                                  ? 'bg-slate-50 text-slate-400'
                                  : 'bg-rose-50 text-rose-600'
                              }`}
                            >
                              {item.isSuccess ? (
                                <CheckCircle2 className="h-5 w-5" />
                              ) : item.value === null ? (
                                <AlertCircle className="h-5 w-5" />
                              ) : (
                                <XCircle className="h-5 w-5" />
                              )}
                            </div>
                          </div>

                          <div className="mb-1 text-xs text-slate-400">
                            監測年度：{formatMonitoringYears(item.monitoringYears)}
                          </div>
                          <div className="mb-2 text-xs text-slate-400">比較區間：{periodLabel}</div>

                          <div className="mb-2 flex items-center gap-2">
                            {item.meta.isNegative ? (
                              <ArrowDownCircle className="h-4 w-4 text-rose-500" />
                            ) : (
                              <ArrowUpCircle className="h-4 w-4 text-emerald-500" />
                            )}
                            <span className={`text-xs ${item.meta.isNegative ? 'text-rose-600' : 'text-emerald-600'}`}>
                              {item.meta.isNegative ? '負向指標（越低越好）' : '正向指標（越高越好）'}
                            </span>
                          </div>

                          <div className="mb-3 rounded-2xl bg-slate-50 py-2">
                            <SegmentedMiniGaugeChart
                              progress={item.gaugeProgress}
                              hasData={item.value !== null}
                            />
                          </div>

                          <h4 className="mb-4 flex-1 text-sm leading-snug text-slate-700 transition-colors group-hover:text-blue-700">
                            {item.name}
                          </h4>

                          <div className="mt-auto grid grid-cols-2 gap-3">
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                              <div className="mb-1 text-xs text-slate-400">{periodValueLabel}</div>
                              <div className={`text-2xl ${item.isSuccess ? 'text-slate-800' : 'text-rose-600'}`}>
                                {item.value !== null
                                  ? item.meta.type === 'avg' || item.meta.unit === '%'
                                    ? Number(item.value).toFixed(1)
                                    : item.value
                                  : '--'}
                              </div>
                              <div className="text-sm text-slate-500">{item.meta.unit}</div>
                            </div>

                            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                              <div className="mb-1 text-xs text-blue-500">年度目標值</div>
                              <div className="text-2xl text-blue-700">
                                {item.target !== null && item.target !== undefined
                                  ? item.meta.type === 'avg' || item.meta.unit === '%'
                                    ? Number(item.target).toFixed(1)
                                    : item.target
                                  : '--'}
                              </div>
                              <div className="text-sm text-blue-500">
                                {item.meta.unit} {item.meta.isNegative ? '(↓)' : '(↑)'}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {currentView === 'detail' && selectedIndicator && selectedMeta && (
              <div className="mx-auto max-w-6xl space-y-6">
                <div className="flex flex-col justify-between gap-4 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:flex-row lg:items-center">
                  <div>
                    <div className="mb-2 flex items-center gap-3">
                      <button
                        onClick={() => setCurrentView('overview')}
                        className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100"
                      >
                        <ChevronRight className="h-5 w-5 rotate-180" />
                      </button>
                      <h2 className="text-xl text-slate-800">{selectedIndicator}</h2>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 pl-9 text-sm text-slate-500">
                      <span className="rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1">
                        運算: {selectedMeta.type === 'avg' ? '平均值' : '加總值'}
                      </span>
                      <span className="rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1">
                        比較基準：{periodLabel}
                      </span>
                      <span className="flex items-center gap-1 rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1">
                        方向：
                        {selectedMeta.isNegative ? (
                          <span className="text-rose-600">越低越好</span>
                        ) : (
                          <span className="text-emerald-600">越高越好</span>
                        )}
                      </span>
                      <span className="rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1">
                        單位: {selectedMeta.unit}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 md:p-8">
                  <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="flex items-center gap-2 text-slate-700">
                      <TrendingUp className="h-5 w-5 text-blue-500" />
                      年度趨勢圖表
                    </h3>
                    <div className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-600">
                      X 軸依年度比較，Y 值依 {periodLabel} 顯示
                    </div>
                  </div>

                  <div className="w-full overflow-x-auto pb-2">
                    <div style={{ minWidth: `${chartMinWidth}px`, height: chartHeight }}>
                      {detailChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          {selectedMeta.type === 'avg' ? (
                            <LineChart data={detailChartData} margin={{ top: 24, right: 20, left: 0, bottom: 24 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                              <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                interval={0}
                                height={xAxisHeight}
                                tick={{ fill: '#64748b', fontSize: isMobile ? 10 : 12, fontWeight: 700 }}
                              />
                              <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748b', fontSize: isMobile ? 10 : 12, fontWeight: 700 }}
                                dx={-10}
                                domain={detailYAxisDomain}
                                tickCount={6}
                              />
                              <Tooltip
                                contentStyle={{
                                  borderRadius: '1rem',
                                  border: 'none',
                                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                  fontWeight: 700,
                                }}
                                formatter={(value, name) => [
                                  formatDisplayValue(
                                    value,
                                    selectedMeta.unit,
                                    name === '年度目標值' ? 'avg' : selectedMeta.type
                                  ),
                                  name,
                                ]}
                              />
                              <Legend iconType="circle" wrapperStyle={{ paddingTop: '12px', fontWeight: 700 }} />
                              <Line
                                type="monotone"
                                dataKey="target"
                                name="年度目標值"
                                stroke="#94a3b8"
                                strokeWidth={2}
                                strokeDasharray="6 6"
                                dot={false}
                              />
                              <Line
                                type="monotone"
                                dataKey="value"
                                name={periodValueLabel}
                                stroke="#2563eb"
                                strokeWidth={3}
                                dot={{ r: isMobile ? 3 : 4, strokeWidth: 2 }}
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
                                    fontWeight: 700,
                                  }}
                                />
                              </Line>
                            </LineChart>
                          ) : (
                            <BarChart data={detailChartData} margin={{ top: 24, right: 20, left: 0, bottom: 24 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                              <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                interval={0}
                                height={xAxisHeight}
                                tick={{ fill: '#64748b', fontSize: isMobile ? 10 : 12, fontWeight: 700 }}
                              />
                              <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748b', fontSize: isMobile ? 10 : 12, fontWeight: 700 }}
                                dx={-10}
                                domain={detailYAxisDomain}
                                tickCount={6}
                              />
                              <Tooltip
                                contentStyle={{
                                  borderRadius: '1rem',
                                  border: 'none',
                                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                  fontWeight: 700,
                                }}
                                formatter={(value, name, props) => {
                                  if (name === periodValueLabel) {
                                    return [formatDisplayValue(value, selectedMeta.unit, 'sum'), name];
                                  }
                                  return [
                                    formatDisplayValue(props?.payload?.target, selectedMeta.unit, 'sum'),
                                    '年度目標值',
                                  ];
                                }}
                              />
                              <Legend iconType="circle" wrapperStyle={{ paddingTop: '12px', fontWeight: 700 }} />
                              <Bar dataKey="value" name={periodValueLabel} radius={[4, 4, 0, 0]} maxBarSize={isMobile ? 32 : 52}>
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
                                    fontWeight: 700,
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
                        <div className="flex h-full items-center justify-center text-slate-400">
                          沒有符合篩選條件的資料可供顯示
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-[2rem] border border-blue-100 bg-blue-50 p-5 shadow-sm sm:p-6 md:p-8">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="shrink-0 rounded-xl bg-blue-100 p-3">
                      <FileText className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg text-blue-900">各年度 review 資料</h3>
                      <p className="text-sm text-slate-600">
                        目前會列出所選年度的 review，方便直接做年度間比較。
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {selectedIndicatorReviews.length > 0 ? (
                      selectedIndicatorReviews.map((item) => (
                        <div
                          key={item.year}
                          className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm"
                        >
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <div className="text-base text-blue-900">{item.year} 年度</div>
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs ${
                                item.hasData
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {item.hasData ? '有資料' : '無資料'}
                            </span>
                          </div>
                          <p className="whitespace-pre-wrap leading-relaxed text-slate-700">
                            {item.review}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-500">暫無可顯示的 review 資料</div>
                    )}
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
