/* aa-core.jsx — AssetAnchor 高保真 prototype：tokens / 資料 / 構件
   匯出至 window 供 aa-screens.jsx 使用。 */

const { createContext, useContext, useState, useEffect, useRef } = React;

/* ============================ 設計 tokens ============================ */
const T = {
  bg:      '#0C0E13',
  screen:  '#0E1117',
  ink:     'rgba(255,255,255,0.95)',
  ink2:    'rgba(255,255,255,0.62)',
  sub:     'rgba(255,255,255,0.42)',
  faint:   'rgba(255,255,255,0.26)',
  line:    'rgba(255,255,255,0.09)',
  line2:   'rgba(255,255,255,0.14)',
  up:      '#2FD37E',
  down:    '#FF5E62',
  buy:     '#FF5E62',   // 台股慣例：買入紅
  sell:    '#2FD37E',   //           賣出綠
};

/* 強調色 / 光暈 / 損益色 / 數字字體 由 Tweaks 控制 */
const AACtx = createContext({ accent: '#7C6CF0', glow: true, pnlColor: true });
const useAA = () => useContext(AACtx);

/* ============================ 資料 ============================ */
const ACCT = {
  CAPITAL:   { name: '群益證券', type: 'BROKERAGE', mkt: 'TW', color: '#4C6FE8', cashTW: 145800, cashUS: 0 },
  FIRSTRADE: { name: 'Firstrade', type: 'BROKERAGE', mkt: 'US', color: '#FF7A45', cashTW: 0,      cashUS: 3250 },
  IBKR:      { name: 'Interactive Brokers', type: 'MARGIN', mkt: 'US', color: '#22C55E', cashTW: 0, cashUS: 0 },
  FUBON:     { name: '富邦證券', type: 'BROKERAGE', mkt: 'TW', color: '#A368F0', cashTW: 100000, cashUS: 0 },
};

// pct=總報酬率%, td=今日% ; avatar bg = av
const HOLD = [
  { sym: '2330',  name: '台積電',         en: 'TSMC',                 ccy: 'NT$', mkt: 'TW', sh: 100,  avg: 550,    val: 110000,  pct: 100.0, td: 2.33,  acct: 'CAPITAL',   av: '#1F8A5B' },
  { sym: 'AAPL',  name: 'Apple',          en: 'Apple Inc.',           ccy: 'US$', mkt: 'US', sh: 8,    avg: 180.5,  val: 1712.88, pct: 18.45, td: 0.62,  acct: 'FIRSTRADE', av: '#222831' },
  { sym: 'VTI',   name: 'Vanguard Total', en: 'Total Stock Market',   ccy: 'US$', mkt: 'US', sh: 12,   avg: 235.0,  val: 3012.00, pct: 6.80,  td: 0.41,  acct: 'IBKR',      av: '#2E62D6' },
  { sym: 'QQQ',   name: 'Invesco QQQ',    en: 'Nasdaq-100 ETF',       ccy: 'US$', mkt: 'US', sh: 5,    avg: 402.0,  val: 2210.00, pct: 9.12,  td: 1.05,  acct: 'FIRSTRADE', av: '#5B43C0' },
  { sym: '0050',  name: '元大台灣50',     en: 'Yuanta TW Top50',      ccy: 'NT$', mkt: 'TW', sh: 500,  avg: 142,    val: 72500,   pct: 2.11,  td: -1.42, acct: 'FUBON',     av: '#B23B3B' },
  { sym: '2317',  name: '鴻海',           en: 'Hon Hai',              ccy: 'NT$', mkt: 'TW', sh: 200,  avg: 178,    val: 38000,   pct: 6.74,  td: 3.42,  acct: 'CAPITAL',   av: '#16785C' },
  { sym: '00878', name: '國泰永續高股息', en: 'Cathay Sustainability', ccy: 'NT$', mkt: 'TW', sh: 1000, avg: 21.4,   val: 21500,   pct: 0.47,  td: -0.55, acct: 'FUBON',     av: '#C08A2E' },
];

const SUM = {
  total: 1238540,            // 總資產 TWD
  totalPct: 7.66,            // 總報酬率
  unrealized: 88200,         // 總未實現損益 TWD
  today: 3420, todayPct: 0.28,
  realized: 12400,           // 本月已實現
  cashTW: 245800, cashUS: 3250,
};

/* 走勢圖假資料 */
const SERIES = {
  '1D':  [52,51,53,52,54,53,55,54,56,58,57,59,58,60,59,61],
  '1W':  [40,44,42,48,46,52,50,55,53,58,60,57,62,66,64,68],
  '1M':  [30,34,32,40,38,44,50,46,54,58,55,64,62,70,68,74],
  '3M':  [22,28,26,38,34,46,42,56,52,64,60,72,68,78,74,82],
  'YTD': [18,24,30,28,40,38,52,48,62,58,72,68,80,78,86,90],
  '1Y':  [12,20,16,30,26,42,38,54,48,66,60,78,72,86,82,94],
  'ALL': [6,14,22,18,34,30,48,44,62,58,76,70,86,82,92,98],
};

/* ============================ 格式化 ============================ */
const nf = (n, d = 0) => Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const money = (h) => `${h.ccy} ${nf(h.val, h.ccy === 'US$' ? 2 : 0)}`;
const price = (h) => h.val / h.sh;
const sumBy = (mkt) => HOLD.filter(h => h.mkt === mkt).reduce((a, h) => a + h.val, 0);

/* ============================ 動畫：數字 count-up ============================ */
function useCountUp(target, dur = 900) {
  const [v, setV] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) { setV(target); return; }
    started.current = true;
    let raf, t0;
    const ease = x => 1 - Math.pow(1 - x, 3);
    const step = (t) => { if (!t0) t0 = t; const p = Math.min((t - t0) / dur, 1); setV(target * ease(p)); if (p < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    // 保底：即使 rAF 被背景節流，動畫時間到後仍確保顯示正確最終值
    const fb = setTimeout(() => setV(target), dur + 80);
    return () => { cancelAnimationFrame(raf); clearTimeout(fb); };
  }, [target]);
  return v;
}

/* ============================ 漲跌文字 ============================ */
function Pnl({ pct, prefix, size = 13, weight = 700, arrow = true }) {
  const { pnlColor } = useAA();
  const up = pct >= 0;
  const col = pnlColor ? (up ? T.up : T.down) : T.ink2;
  return (
    <span className="num" style={{ color: col, fontSize: size, fontWeight: weight, whiteSpace: 'nowrap' }}>
      {arrow ? (up ? '▲ ' : '▼ ') : (up ? '+' : '−')}{prefix || ''}{Math.abs(pct).toFixed(2)}%
    </span>
  );
}
function PnlAmt({ amt, ccy = 'NT$', size = 13, weight = 700 }) {
  const { pnlColor } = useAA();
  const up = amt >= 0;
  const col = pnlColor ? (up ? T.up : T.down) : T.ink2;
  return <span className="num" style={{ color: col, fontSize: size, fontWeight: weight, whiteSpace: 'nowrap' }}>{up ? '▲' : '▼'} {ccy} {nf(Math.abs(amt), ccy === 'US$' ? 2 : 0)}</span>;
}

/* ============================ 圖表 ============================ */
function chartPath(vals, w, h, pad) {
  const min = Math.min(...vals), max = Math.max(...vals), n = vals.length;
  const xs = i => pad + (i * (w - pad * 2)) / (n - 1);
  const ys = v => h - pad - ((v - min) / (max - min || 1)) * (h - pad * 2);
  const pts = vals.map((v, i) => [xs(i), ys(v)]);
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], cx = (x0 + x1) / 2;
    d += ` C ${cx} ${y0} ${cx} ${y1} ${x1} ${y1}`;
  }
  return { line: d, area: `${d} L ${pts[n - 1][0]} ${h} L ${pts[0][0]} ${h} Z`, last: pts[n - 1] };
}
let chartSeq = 0;
function Chart({ tf = '1Y', vals, height = 150, dot = true, baseline = true }) {
  const { accent, glow } = useAA();
  const w = 320, h = height;
  const data = vals || SERIES[tf] || SERIES['1Y'];
  const { line, area, last } = chartPath(data, w, h, 12);
  const id = useRef('aac' + (++chartSeq)).current;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id={id + 'f'} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.34" />
          <stop offset="55%" stopColor={accent} stopOpacity="0.10" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={id + 'l'} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={accent} stopOpacity="0.65" />
          <stop offset="100%" stopColor={accent} stopOpacity="1" />
        </linearGradient>
        {glow && <filter id={id + 'g'} x="-20%" y="-40%" width="140%" height="180%"><feGaussianBlur stdDeviation="3.4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>}
      </defs>
      {baseline && <line x1="0" y1={h - 12} x2={w} y2={h - 12} stroke={T.line} strokeWidth="1" strokeDasharray="2 5" />}
      <path d={area} fill={`url(#${id}f)`} />
      <path d={line} fill="none" stroke={`url(#${id}l)`} strokeWidth="2.4" strokeLinecap="round" filter={glow ? `url(#${id}g)` : undefined} />
      {dot && <><circle cx={last[0]} cy={last[1]} r="6.5" fill={accent} opacity="0.22" /><circle cx={last[0]} cy={last[1]} r="3.4" fill="#fff" stroke={accent} strokeWidth="2" /></>}
    </svg>
  );
}

/* ============================ 代號圓標 ============================ */
function Avatar({ h, size = 40 }) {
  const label = /^[A-Z]+$/.test(h.sym) ? h.sym[0] : h.sym;
  const small = label.length > 2;
  return (
    <div className="num" style={{
      width: size, height: size, borderRadius: '50%', flex: '0 0 auto', display: 'grid', placeItems: 'center',
      background: `linear-gradient(150deg, ${h.av}, ${h.av}cc)`, color: '#fff', fontWeight: 800,
      fontSize: small ? 12 : 14, letterSpacing: '.01em', boxShadow: `0 4px 12px -4px ${h.av}99, inset 0 1px 0 rgba(255,255,255,.18)`,
    }}>{label}</div>
  );
}

/* ============================ 卡片 ============================ */
function Card({ children, style, glowAccent, onClick, className = '' }) {
  const { accent, glow } = useAA();
  return (
    <div onClick={onClick} className={'aa-card ' + className} style={{
      position: 'relative', borderRadius: 18, padding: 16,
      background: 'linear-gradient(160deg, rgba(255,255,255,0.055), rgba(255,255,255,0.022))',
      border: `1px solid ${T.line}`,
      boxShadow: glow && glowAccent ? `0 10px 30px -16px ${accent}66, inset 0 1px 0 rgba(255,255,255,0.06)` : '0 10px 26px -18px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05)',
      cursor: onClick ? 'pointer' : 'default', ...style,
    }}>{children}</div>
  );
}

/* ============================ segmented ============================ */
function Segmented({ options, value, onChange, size = 13 }) {
  const { accent } = useAA();
  return (
    <div style={{ display: 'flex', gap: 4, padding: 4, background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.line}`, borderRadius: 13 }}>
      {options.map(o => {
        const on = o === value;
        return <button key={o} onClick={() => onChange(o)} style={{
          flex: 1, padding: '8px 0', border: 'none', borderRadius: 9, cursor: 'pointer', fontFamily: 'inherit',
          background: on ? `linear-gradient(160deg, ${accent}, ${accent}cc)` : 'transparent',
          color: on ? '#fff' : T.sub, fontSize: size, fontWeight: on ? 700 : 500,
          boxShadow: on ? `0 6px 16px -8px ${accent}` : 'none', transition: 'all .18s',
        }}>{o}</button>;
      })}
    </div>
  );
}

/* ============================ 時間 tabs ============================ */
function TimeTabs({ value, onChange, items = ['1D', '1W', '1M', '3M', 'YTD', '1Y', 'ALL'] }) {
  const { accent } = useAA();
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
      {items.map(t => {
        const on = t === value;
        return <button key={t} className="num" onClick={() => onChange(t)} style={{
          border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: on ? '5px 12px' : '5px 7px', borderRadius: 100,
          background: on ? '#fff' : 'transparent', color: on ? '#111' : T.sub, fontSize: 12, fontWeight: on ? 800 : 600, transition: 'all .16s',
        }}>{t}</button>;
      })}
    </div>
  );
}

/* ============================ 狀態列 ============================ */
function StatusBar({ dark }) {
  const c = dark ? '#fff' : T.ink;
  return (
    <div className="num" style={{ height: 30, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 22px', color: c, fontSize: 13, fontWeight: 700, flex: '0 0 auto' }}>
      <span>9:41</span>
      <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', opacity: .9 }}>
        <span style={{ letterSpacing: 1 }}>▮▮▮</span><span>⌃</span><span style={{ fontSize: 11 }}>100%▮</span>
      </span>
    </div>
  );
}

/* ============================ icons + tab bar ============================ */
function Icon({ id, color, size = 22 }) {
  const s = { fill: 'none', stroke: color, strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const sf = { fill: color, stroke: 'none' };
  const P = {
    holdings: <><path d="M3 14l4-4 4 3 6-7" {...s} /><path d="M15 6h3v3" {...s} /></>,
    txn: <><rect x="3" y="4" width="15" height="13" rx="2.4" {...s} /><path d="M6 9h9M6 12.5h6" {...s} /></>,
    accounts: <><path d="M3 8.5l7.5-4.2 7.5 4.2M4.5 8.5V16h12V8.5" {...s} /><path d="M8.5 16v-3.4h4V16" {...s} /></>,
    settings: <><circle cx="10.5" cy="10.5" r="3" {...s} /><path d="M10.5 2.4v2.2M10.5 16.4v2.2M2.4 10.5h2.2M16.4 10.5h2.2M4.8 4.8l1.5 1.5M14.7 14.7l1.5 1.5M16.2 4.8l-1.5 1.5M5.3 14.7l1.5 1.5" {...s} /></>,
    back: <path d="M13 5l-6 6 6 6" {...s} strokeWidth="2" />,
    more: <><circle cx="5" cy="11" r="1.5" {...sf} /><circle cx="11" cy="11" r="1.5" {...sf} /><circle cx="17" cy="11" r="1.5" {...sf} /></>,
    bell: <><path d="M6 9a5 5 0 0110 0c0 5 2 6 2 6H4s2-1 2-6z" {...s} /><path d="M9 18a2 2 0 004 0" {...s} /></>,
    plus: <path d="M11 5v12M5 11h12" {...s} strokeWidth="2.2" />,
    refresh: <><path d="M16 6a6 6 0 10.9 7" {...s} /><path d="M16 2.5V6h-3.5" {...s} /></>,
    cal: <><rect x="3" y="5" width="15" height="13" rx="2.4" {...s} /><path d="M3 9h15M7 3v3M14 3v3" {...s} /></>,
    chev: <path d="M8 5l5 5.5-5 5.5" {...s} />,
  };
  return <svg viewBox="0 0 21 21" width={size} height={size}>{P[id]}</svg>;
}

const TABS = [{ id: 'holdings', label: '持倉' }, { id: 'txn', label: '交易' }, { id: 'accounts', label: '帳戶' }, { id: 'settings', label: '設定' }];
function TabBar({ active, onChange }) {
  const { accent } = useAA();
  return (
    <div style={{ flex: '0 0 auto', display: 'flex', borderTop: `1px solid ${T.line}`, background: 'rgba(12,14,19,0.86)', backdropFilter: 'blur(12px)', paddingBottom: 8 }}>
      {TABS.map(t => {
        const on = t.id === active;
        return <button key={t.id} onClick={() => onChange(t.id)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '9px 0 4px', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
          <Icon id={t.id} color={on ? accent : T.faint} />
          <span style={{ fontSize: 10, color: on ? accent : T.sub, fontWeight: on ? 700 : 500 }}>{t.label}</span>
        </button>;
      })}
    </div>
  );
}

/* ============================ 圓鈕 ============================ */
function IconBtn({ id, onClick, accent: useAccent, label }) {
  const { accent } = useAA();
  return (
    <button onClick={onClick} aria-label={label} style={{
      width: 38, height: 38, borderRadius: '50%', cursor: 'pointer', display: 'grid', placeItems: 'center', fontFamily: 'inherit',
      background: useAccent ? `linear-gradient(160deg, ${accent}, ${accent}cc)` : 'rgba(255,255,255,0.06)',
      border: useAccent ? 'none' : `1px solid ${T.line2}`,
      boxShadow: useAccent ? `0 8px 20px -8px ${accent}` : 'none', transition: 'transform .12s',
    }} onMouseDown={e => e.currentTarget.style.transform = 'scale(0.92)'} onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
      <Icon id={id} color={useAccent ? '#fff' : T.ink2} size={20} />
    </button>
  );
}

Object.assign(window, {
  T, AACtx, useAA, ACCT, HOLD, SUM, SERIES,
  nf, money, price, sumBy, useCountUp,
  Pnl, PnlAmt, Chart, Avatar, Card, Segmented, TimeTabs, StatusBar, Icon, TABS, TabBar, IconBtn,
});
