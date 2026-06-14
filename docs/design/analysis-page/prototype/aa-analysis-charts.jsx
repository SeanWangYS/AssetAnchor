/* aa-analysis-charts.jsx — 分析頁：mock 衍生資料 + 圖表構件
   依賴 aa-core.jsx（T, HOLD, nf, useAA, Pnl, PnlAmt, Card）。匯出至 window。 */

const ARATE = 30.95; // USD -> TWD（demo，與 holdings prototype 一致）
const A_ETF = ['VTI', 'QQQ', '0050', '00878'];

/* 衍生持股資料（統一以 TWD 計）。
   微調：00878 市值 21,500 → 20,800，做出一筆小幅虧損，讓正負分色有示範。 */
const AHOLD = HOLD.map(h => {
  const isUS = h.ccy === 'US$';
  const val0 = h.sym === '00878' ? 20800 : h.val;
  const cost0 = h.avg * h.sh;
  const valT = isUS ? val0 * ARATE : val0;
  const costT = isUS ? cost0 * ARATE : cost0;
  const pnlT = valT - costT;
  return { ...h, valT, costT, pnlT, ret: (pnlT / costT) * 100, cls: A_ETF.includes(h.sym) ? 'ETF' : '個股' };
});

const ATOT = (() => {
  const val = AHOLD.reduce((a, h) => a + h.valT, 0);
  const cost = AHOLD.reduce((a, h) => a + h.costT, 0);
  return { val, cost, pnl: val - cost, ret: ((val - cost) / cost) * 100 };
})();

const ACLS = ['個股', 'ETF'].map(cls => {
  const list = AHOLD.filter(h => h.cls === cls);
  const val = list.reduce((a, h) => a + h.valT, 0);
  return { cls, n: list.length, val, pct: (val / ATOT.val) * 100 };
});

/* 幣別顯示（內部值一律 TWD，顯示時換算） */
const aCv = (twd, ccy) => (ccy === 'USD' ? twd / ARATE : twd);
const fA = (twd, ccy = 'TWD', signed = false) => {
  const s = signed ? (twd >= 0 ? '+' : '−') : '';
  return `${s}${ccy === 'USD' ? 'US$' : 'NT$'} ${nf(Math.abs(aCv(twd, ccy)), 0)}`;
};
const aClsColor = (cls, accent) => (cls === '個股' ? accent : '#35C6EA');

/* ============================ 圓餅 / 甜甜圈 ============================ */
const aPol = (cx, cy, r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];

function ADonut({ size = 160, thick = 26, center = true, centerPct = false, ccy = 'TWD' }) {
  const { accent, glow, donut } = useAA();
  const isD = donut !== false;
  const cx = size / 2, cy = size / 2;
  const r = isD ? (size - thick) / 2 : size / 2 - 2;
  const gap = isD ? 0.055 : 0.02;
  let a = -Math.PI / 2;
  const segs = ACLS.map(c => {
    const sweep = (c.pct / 100) * Math.PI * 2;
    const s = { ...c, a0: a + gap / 2, a1: a + sweep - gap / 2 };
    a += sweep;
    return s;
  });
  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block', overflow: 'visible' }}>
        {segs.map(s => {
          const col = aClsColor(s.cls, accent);
          const [x0, y0] = aPol(cx, cy, r, s.a0);
          const [x1, y1] = aPol(cx, cy, r, s.a1);
          const large = s.a1 - s.a0 > Math.PI ? 1 : 0;
          const f = glow ? `drop-shadow(0 3px 9px ${col}55)` : 'none';
          if (isD) {
            return <path key={s.cls} d={`M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`} fill="none" stroke={col} strokeWidth={thick} style={{ filter: f }}></path>;
          }
          return <path key={s.cls} d={`M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`} fill={col} stroke="#0E1117" strokeWidth="2" style={{ filter: f }}></path>;
        })}
      </svg>
      {isD && center && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center', pointerEvents: 'none' }}>
          <div>
            <div style={{ color: T.sub, fontSize: 10.5 }}>持股市值</div>
            <div className="num" style={{ color: T.ink, fontSize: size > 140 ? 16.5 : 12, fontWeight: 800, marginTop: 2 }}>{fA(ATOT.val, ccy)}</div>
            {centerPct && <div style={{ marginTop: 2 }}><Pnl pct={ATOT.ret} size={11} arrow={false} /></div>}
          </div>
        </div>
      )}
    </div>
  );
}

function ALegend({ ccy = 'TWD' }) {
  const { accent } = useAA();
  return (
    <div style={{ marginTop: 13 }}>
      {ACLS.map((c, i) => {
        const col = aClsColor(c.cls, accent);
        return (
          <div key={c.cls} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8.5px 0', borderTop: i ? `1px solid ${T.line}` : 'none' }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: col, boxShadow: `0 0 8px ${col}66`, flex: '0 0 auto' }}></span>
            <span style={{ color: T.ink, fontSize: 12.5, fontWeight: 600 }}>{c.cls}</span>
            <span style={{ color: T.faint, fontSize: 11 }}>{c.n} 檔</span>
            <span className="num" style={{ marginLeft: 'auto', color: T.ink2, fontSize: 12 }}>{fA(c.val, ccy)}</span>
            <span className="num" style={{ color: T.ink, fontSize: 12.5, fontWeight: 800, width: 50, textAlign: 'right' }}>{c.pct.toFixed(1)}%</span>
          </div>
        );
      })}
    </div>
  );
}

/* ============================ 市值 vs 投入成本（直向雙柱） ============================ */
function ALegendDot({ color, label }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: T.sub, fontSize: 10.5 }}>
      <span style={{ width: 8, height: 8, borderRadius: 2.5, background: color, flex: '0 0 auto' }}></span>{label}
    </span>
  );
}

/* nice-number 刻度（給網格線用） */
const aNice = (v) => {
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const m = v / p;
  const lad = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
  return (lad.find(x => m <= x) || 10) * p;
};
const aShortN = (v) => {
  if (v >= 1000) { const k = v / 1000; return `${k % 1 ? k.toFixed(1) : k}K`; }
  return String(Math.round(v));
};

function ABarsVC({ ccy = 'TWD' }) {
  const { accent } = useAA();
  const rows = [...AHOLD].sort((a, b) => b.valT - a.valT);
  const nice = aNice(aCv(rows[0].valT, ccy));
  const hPct = (twd) => (aCv(twd, ccy) / nice) * 100;
  return (
    <div>
      <div style={{ position: 'relative', marginTop: 18 }}>
        {[1, 0.5].map(f => (
          <div key={f} style={{ position: 'absolute', left: 0, right: 0, top: `${(1 - f) * 126}px`, borderTop: `1px dashed ${T.line}` }}>
            <span className="num" style={{ position: 'absolute', right: 0, top: -13, fontSize: 8.5, color: T.faint }}>{aShortN(nice * f)}</span>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 6, height: 126, alignItems: 'flex-end' }}>
          {rows.map(h => (
            <div key={h.sym} style={{ flex: 1, display: 'flex', gap: 3, alignItems: 'flex-end', justifyContent: 'center', height: '100%' }}>
              <div style={{ width: 9, height: `${hPct(h.costT)}%`, background: 'rgba(255,255,255,0.20)', borderRadius: '3px 3px 0 0' }}></div>
              <div style={{ width: 9, height: `${hPct(h.valT)}%`, background: `linear-gradient(180deg, ${accent}, ${accent}77)`, borderRadius: '3px 3px 0 0' }}></div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ height: 1, background: T.line, marginTop: 0 }}></div>
      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
        {rows.map(h => <span key={h.sym} className="num" style={{ flex: 1, textAlign: 'center', color: T.sub, fontSize: 9 }}>{h.sym}</span>)}
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 11, justifyContent: 'center' }}>
        <ALegendDot color="rgba(255,255,255,0.20)" label="投入成本" />
        <ALegendDot color={accent} label="目前市值" />
      </div>
    </div>
  );
}

/* ============================ 橫向長條（通用） ============================ */
function AHBars({ rows, rowH = 33 }) {
  return (
    <div style={{ marginTop: 8 }}>
      {rows.map(r => (
        <div key={r.sym} style={{ display: 'grid', gridTemplateColumns: '82px 1fr 88px', alignItems: 'center', gap: 10, height: rowH }}>
          <div style={{ minWidth: 0 }}>
            <div className="num" style={{ color: T.ink, fontSize: 11.5, fontWeight: 700, lineHeight: 1.15 }}>{r.sym}</div>
            <div style={{ color: T.faint, fontSize: 9.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3 }}>{r.name}</div>
          </div>
          <div style={{ height: 9, borderRadius: 100, background: 'rgba(255,255,255,0.055)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.max(r.w * 100, 2.5)}%`, borderRadius: 100, background: r.grad }}></div>
          </div>
          <div className="num" style={{ textAlign: 'right', color: r.col, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>{r.right}</div>
        </div>
      ))}
    </div>
  );
}

/* 報酬率 %（正負分色） */
function ARetBars({ rowH }) {
  const { pnlColor } = useAA();
  const rows = [...AHOLD].sort((a, b) => b.ret - a.ret);
  const m = Math.max(...rows.map(h => Math.abs(h.ret)));
  return (
    <AHBars rowH={rowH} rows={rows.map(h => {
      const up = h.ret >= 0;
      const c = pnlColor === false ? T.ink2 : up ? T.up : T.down;
      return { sym: h.sym, name: h.name, w: Math.abs(h.ret) / m, grad: `linear-gradient(90deg, ${c}99, ${c})`, col: c, right: `${up ? '+' : '−'}${Math.abs(h.ret).toFixed(1)}%` };
    })} />
  );
}

/* 未實現損益金額（正負分色） */
function APnlBars({ ccy = 'TWD', rowH }) {
  const { pnlColor } = useAA();
  const rows = [...AHOLD].sort((a, b) => b.pnlT - a.pnlT);
  const m = Math.max(...rows.map(h => Math.abs(h.pnlT)));
  return (
    <AHBars rowH={rowH} rows={rows.map(h => {
      const up = h.pnlT >= 0;
      const c = pnlColor === false ? T.ink2 : up ? T.up : T.down;
      return { sym: h.sym, name: h.name, w: Math.abs(h.pnlT) / m, grad: `linear-gradient(90deg, ${c}99, ${c})`, col: c, right: fA(h.pnlT, ccy, true) };
    })} />
  );
}

/* 市值佔比（accent 單色） */
function AShareBars({ rowH }) {
  const { accent } = useAA();
  const rows = [...AHOLD].sort((a, b) => b.valT - a.valT);
  const m = rows[0].valT / ATOT.val;
  return (
    <AHBars rowH={rowH} rows={rows.map(h => {
      const p = h.valT / ATOT.val;
      return { sym: h.sym, name: h.name, w: p / m, grad: `linear-gradient(90deg, ${accent}88, ${accent})`, col: T.ink, right: `${(p * 100).toFixed(1)}%` };
    })} />
  );
}

Object.assign(window, {
  ARATE, AHOLD, ATOT, ACLS, aCv, fA, aClsColor, aNice, aShortN,
  ADonut, ALegend, ABarsVC, AHBars, ARetBars, APnlBars, AShareBars, ALegendDot,
});
