/* aa-analysis-page.jsx — 高保真分析頁（版型 A 定稿）：手機內可捲動的完整頁
   依賴 aa-core.jsx + aa-analysis-charts.jsx。匯出 AnalysisPage / AnalysisPieIcon。 */

const { useState: apS } = React;

/* 分析 tab icon（圓餅） */
function AnalysisPieIcon({ color, size = 22 }) {
  return (
    <svg viewBox="0 0 21 21" width={size} height={size}>
      <circle cx="10.5" cy="10.5" r="7.6" fill="none" stroke={color} strokeWidth="1.8"></circle>
      <path d="M10.5 10.5V2.9M10.5 10.5l6.6 3.9" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round"></path>
    </svg>
  );
}

/* 圖卡 */
function AnaCard({ title, sub, children, glowAccent }) {
  return (
    <Card glowAccent={glowAccent} style={{ marginTop: 12, padding: '14px 16px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <span style={{ color: T.ink, fontSize: 13.5, fontWeight: 700 }}>{title}</span>
        {sub && <span className="num" style={{ color: T.faint, fontSize: 10.5, whiteSpace: 'nowrap' }}>{sub}</span>}
      </div>
      {children}
    </Card>
  );
}

/* Hero：持股市值 count-up */
function AnalysisHero({ ccy }) {
  const v = useCountUp(aCv(ATOT.val, ccy), 950);
  const cy = ccy === 'USD' ? 'US$' : 'NT$';
  return (
    <div style={{ paddingTop: 2 }}>
      <div style={{ color: T.sub, fontSize: 12.5 }}>持股市值（{ccy}）</div>
      <div className="num" style={{ color: T.ink, fontSize: 32, fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1.1, marginTop: 2 }}>{cy} {nf(Math.round(v))}</div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
        <PnlAmt amt={aCv(ATOT.pnl, ccy)} ccy={cy} size={13.5} />
        <Pnl pct={ATOT.ret} size={13} arrow={false} />
        <span style={{ color: T.sub, fontSize: 12 }}>全期</span>
      </div>
      <div style={{ color: T.faint, fontSize: 10, marginTop: 5 }}>不含現金 · 匯率 1 USD = {ARATE} TWD · 資料延遲 15 分鐘</div>
    </div>
  );
}

/* ======================================================================
   分析頁（垂直捲動卡片）
   ====================================================================== */
function AnalysisPage({ onToast }) {
  const [ccy, setCcy] = apS('TWD');
  return (
    <div style={{ flex: 1, overflowY: 'auto' }} className="aa-scroll">
      <div style={{ display: 'flex', alignItems: 'center', padding: '4px 20px 8px' }}>
        <div style={{ color: T.ink, fontSize: 23, fontWeight: 800, flex: 1, letterSpacing: '-.01em' }}>分析</div>
        <IconBtn id="refresh" label="刷新報價" onClick={() => onToast && onToast('報價已更新（demo）')} />
      </div>

      <div style={{ padding: '0 20px' }}>
        <AnalysisHero ccy={ccy} />
        <div style={{ marginTop: 14 }}><Segmented options={['TWD', 'USD']} value={ccy} onChange={setCcy} /></div>

        <AnaCard title="資產配置" sub="依資產類別" glowAccent>
          <div style={{ marginTop: 18 }}><ADonut size={168} thick={28} centerPct ccy={ccy} /></div>
          <ALegend ccy={ccy} />
        </AnaCard>

        <AnaCard title="市值 vs 投入成本" sub={`單位：${ccy}`}>
          <ABarsVC ccy={ccy} />
        </AnaCard>

        <AnaCard title="報酬率" sub="全期 · 依報酬率排序">
          <ARetBars rowH={36} />
        </AnaCard>

        <AnaCard title="未實現損益" sub={`單位：${ccy}`}>
          <APnlBars ccy={ccy} rowH={36} />
        </AnaCard>

        <AnaCard title="市值佔比" sub="佔持股市值 %">
          <AShareBars rowH={36} />
        </AnaCard>

        <div style={{ height: 16 }}></div>
      </div>
    </div>
  );
}

Object.assign(window, { AnalysisPieIcon, AnalysisPage, AnaCard });
