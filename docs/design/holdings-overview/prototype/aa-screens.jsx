/* aa-screens.jsx — Home(B 儀表板) + AssetDetail + AddTransaction + App */

const { useState: uS, useEffect: uE, useRef: uR } = React;
const RATE = 30.95; // USD -> TWD（demo）

/* ======================================================================
   首頁 — B 數據優先（儀表板）
   ====================================================================== */
function StatCell({ label, children, accentGlow }) {
  return (
    <Card glowAccent={accentGlow} style={{ padding: 13, borderRadius: 16 }}>
      <div style={{ color: T.sub, fontSize: 11.5, fontWeight: 500 }}>{label}</div>
      <div style={{ marginTop: 7 }}>{children}</div>
    </Card>
  );
}

function GroupHeader({ dot, label, sub, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '15px 2px 7px' }}>
      {dot && <span style={{ width: 8, height: 8, borderRadius: 3, background: dot, flex: '0 0 auto', boxShadow: `0 0 8px ${dot}aa` }}></span>}
      <span style={{ color: T.ink, fontSize: 13, fontWeight: 700 }}>{label}</span>
      {sub && <span style={{ color: T.faint, fontSize: 11 }}>{sub}</span>}
      <span className="num" style={{ marginLeft: 'auto', color: T.sub, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>{right}</span>
    </div>
  );
}

function Row({ h, onClick, dense }) {
  return (
    <button onClick={onClick} className="aa-row" style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: dense ? '9px 6px' : '11px 6px',
      background: 'transparent', border: 'none', borderTop: `1px solid ${T.line}`, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
    }}>
      <Avatar h={h} size={dense ? 34 : 40} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
          <span style={{ color: T.ink, fontWeight: 600, fontSize: dense ? 14 : 15 }}>{h.name}</span>
          <span className="num" style={{ color: T.sub, fontSize: 12 }}>{h.sym}</span>
        </div>
        <div className="num" style={{ color: T.sub, fontSize: 12, marginTop: 2 }}>{h.sh} 股 · 均價 {h.ccy}{nf(h.avg, h.ccy === 'US$' ? 2 : 0)}</div>
      </div>
      <div style={{ textAlign: 'right', flex: '0 0 auto' }}>
        <div className="num" style={{ color: T.ink, fontWeight: 700, fontSize: dense ? 14 : 15, whiteSpace: 'nowrap' }}>{money(h)}</div>
        <div style={{ marginTop: 2 }}><Pnl pct={h.pct} size={12} /></div>
      </div>
    </button>
  );
}

function HoldingList({ mode, onRow }) {
  if (mode === '帳戶') {
    return Object.entries(ACCT).map(([id, a]) => {
      const list = HOLD.filter(h => h.acct === id);
      if (!list.length) return null;
      const sub = {}; list.forEach(h => sub[h.ccy] = (sub[h.ccy] || 0) + h.val);
      const right = Object.entries(sub).map(([c, v]) => `${c} ${nf(Math.round(v))}`).join(' · ');
      return <div key={id}><GroupHeader label={a.name} sub={`${list.length} 檔`} right={right} />{list.map(h => <Row key={h.sym} h={h} dense onClick={() => onRow(h)} />)}</div>;
    });
  }
  if (mode === '類別') {
    return [['台股 · TWD', 'TW', 'NT$'], ['美股 · USD', 'US', 'US$']].map(([label, mkt, ccy]) => {
      const list = HOLD.filter(h => h.mkt === mkt);
      return <div key={mkt}><GroupHeader label={label} sub={`${list.length} 檔`} right={`${ccy} ${nf(Math.round(sumBy(mkt)), ccy === 'US$' ? 2 : 0)}`} />{list.map(h => <Row key={h.sym} h={h} dense onClick={() => onRow(h)} />)}</div>;
    });
  }
  return <div style={{ marginTop: 2 }}>{HOLD.map(h => <Row key={h.sym} h={h} onClick={() => onRow(h)} />)}</div>;
}

function Home({ onRow, onAdd, onTab, tab }) {
  const { accent } = useAA();
  const [tf, setTf] = uS('1Y');
  const [seg, setSeg] = uS('持股');
  const total = useCountUp(SUM.total, 950);

  if (tab !== 'holdings') {
    const map = { txn: ['交易紀錄', 'txn'], accounts: ['我的帳戶', 'accounts'], settings: ['設定', 'settings'] };
    const [title, icon] = map[tab];
    return (
      <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: 30, textAlign: 'center' }}>
        <div>
          <div style={{ width: 64, height: 64, margin: '0 auto 16px', borderRadius: 18, background: 'linear-gradient(160deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))', border: `1px solid ${T.line}`, display: 'grid', placeItems: 'center' }}><Icon id={icon} color={accent} size={28} /></div>
          <div style={{ color: T.ink, fontSize: 17, fontWeight: 700 }}>{title}</div>
          <div style={{ color: T.sub, fontSize: 13, lineHeight: 1.6, marginTop: 8 }}>此 prototype 聚焦<b style={{ color: T.ink2 }}>持倉總覽</b>流程<br />（首頁 → 資產詳情 → 新增交易）</div>
          <button onClick={() => onTab('holdings')} style={{ marginTop: 18, padding: '9px 18px', borderRadius: 100, border: `1px solid ${T.line2}`, background: 'transparent', color: T.ink2, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>回持倉總覽</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto' }} className="aa-scroll">
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '4px 20px 8px' }}>
        <div style={{ color: T.ink, fontSize: 23, fontWeight: 800, flex: 1, letterSpacing: '-.01em' }}>持倉總覽</div>
        <div style={{ display: 'flex', gap: 9 }}>
          <IconBtn id="bell" label="通知" />
          <IconBtn id="plus" accent label="新增交易" onClick={onAdd} />
        </div>
      </div>

      <div style={{ padding: '0 20px' }}>
        {/* hero */}
        <div style={{ position: 'relative', paddingTop: 6 }}>
          <div style={{ color: T.sub, fontSize: 12.5 }}>總資產（TWD）</div>
          <div className="num" style={{ color: T.ink, fontSize: 38, fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1.05, marginTop: 3 }}>NT$ {nf(Math.round(total))}</div>
          <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 8 }}>
            <PnlAmt amt={SUM.unrealized} size={14} />
            <Pnl pct={SUM.totalPct} size={13} arrow={false} />
            <span style={{ color: T.sub, fontSize: 12 }}>全期</span>
          </div>
        </div>

        {/* 2x2 摘要 bento */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
          <StatCell label="總報酬率" accentGlow>
            <Pnl pct={SUM.totalPct} size={21} weight={800} />
          </StatCell>
          <StatCell label="總未實現損益">
            <PnlAmt amt={SUM.unrealized} size={18} />
          </StatCell>
          <StatCell label="今日損益">
            <div className="num"><PnlAmt amt={SUM.today} size={16} /></div>
            <div style={{ marginTop: 3 }}><Pnl pct={SUM.todayPct} size={12} arrow={false} /></div>
          </StatCell>
          <StatCell label="本月已實現損益">
            <PnlAmt amt={SUM.realized} size={18} />
          </StatCell>
        </div>

        {/* 走勢圖卡片 */}
        <Card style={{ marginTop: 12, padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: T.ink, fontSize: 13, fontWeight: 700 }}>資產走勢</span>
            <span className="num" style={{ color: T.sub, fontSize: 11 }}>{tf}</span>
          </div>
          <div style={{ marginTop: 10 }}><Chart tf={tf} height={108} /></div>
          <TimeTabs value={tf} onChange={setTf} items={['1M', '3M', 'YTD', '1Y', 'ALL']} />
        </Card>

        <div style={{ marginTop: 16 }}><Segmented options={['持股', '帳戶', '類別']} value={seg} onChange={setSeg} /></div>
        <HoldingList mode={seg} onRow={onRow} />
        <div style={{ height: 14 }}></div>
      </div>
    </div>
  );
}

/* ======================================================================
   資產詳情（push）
   ====================================================================== */
function AssetDetail({ h, onClose, onAdd }) {
  const { accent } = useAA();
  const [tf, setTf] = uS('1M');
  const [ccy, setCcy] = uS(h.ccy === 'US$' ? 'USD' : 'TWD');
  const cost = h.avg * h.sh;
  const unreal = h.val - cost;
  const acct = ACCT[h.acct];

  // 幣別換算（demo）
  const conv = (amt, fromCcy) => {
    const isUS = fromCcy === 'US$';
    if (ccy === 'USD') return (isUS ? amt : amt / RATE);
    return (isUS ? amt * RATE : amt);
  };
  const cy = ccy === 'USD' ? 'US$' : 'NT$';
  const dp = ccy === 'USD' ? 2 : 0;
  const show = (amt) => `${cy} ${nf(conv(amt, h.ccy), dp)}`;

  return (
    <div className="aa-push">
      <StatusBar />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 14px 10px', flex: '0 0 auto' }}>
        <IconBtn id="back" label="返回" onClick={onClose} />
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ color: T.ink, fontWeight: 700, fontSize: 15 }}><span className="num">{h.sym}</span> {h.name}</div>
          <div style={{ color: T.sub, fontSize: 11 }}>{h.en} · {h.mkt === 'TW' ? '台股' : '美股'}</div>
        </div>
        <IconBtn id="more" label="更多" />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }} className="aa-scroll">
        <div style={{ color: T.sub, fontSize: 12, marginTop: 4 }}>目前股價</div>
        <div className="num" style={{ color: T.ink, fontSize: 33, fontWeight: 800, letterSpacing: '-.02em' }}>{h.ccy} {nf(price(h), h.ccy === 'US$' ? 2 : 2)}</div>
        <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 8 }}>
          <PnlAmt amt={price(h) * h.td / 100} ccy={h.ccy} size={14} />
          <Pnl pct={h.td} size={13} arrow={false} />
          <span style={{ color: T.sub, fontSize: 12 }}>今日</span>
        </div>
        <div style={{ color: T.faint, fontSize: 10.5, marginTop: 5 }}>資料延遲 15 分鐘 · Yahoo Finance</div>

        <div style={{ marginTop: 16 }}><Chart tf={tf} height={164} /></div>
        <TimeTabs value={tf} onChange={setTf} items={['1D', '1W', '1M', '3M', '1Y', 'ALL']} />

        <div style={{ marginTop: 18 }}><Segmented options={['TWD', 'USD']} value={ccy} onChange={setCcy} /></div>

        <Card style={{ marginTop: 14 }}>
          <div style={{ color: T.ink, fontWeight: 700, fontSize: 14, marginBottom: 4 }}>我的持倉</div>
          <Kv k="持有股數" v={`${nf(h.sh)} 股`} />
          <Kv k="平均成本" v={show(h.avg)} />
          <Kv k="市值" v={show(h.val)} />
          <Kv k="未實現損益" v={<span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}><PnlAmt amt={conv(unreal, h.ccy)} ccy={cy} size={13} /><Pnl pct={h.pct} size={12} arrow={false} /></span>} />
          <Kv k="帳戶分布" v={acct.name} last />
        </Card>

        <button onClick={onAdd} className="aa-ghost" style={{ marginTop: 14, borderColor: accent + '66', color: accent }}>＋ 為此標的新增交易</button>
        <button className="aa-ghost" style={{ marginTop: 10 }}>查看完整交易歷史</button>
      </div>
    </div>
  );
}
function Kv({ k, v, last }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: last ? 'none' : `1px solid ${T.line}` }}>
      <span style={{ color: T.sub, fontSize: 13 }}>{k}</span>
      <span className="num" style={{ color: T.ink, fontSize: 13.5, fontWeight: 600 }}>{v}</span>
    </div>
  );
}

/* ======================================================================
   新增交易（bottom sheet）
   ====================================================================== */
function AddTransaction({ onClose, onSaved, preset }) {
  const { accent } = useAA();
  const [type, setType] = uS('買入');
  const [qty, setQty] = uS(preset ? String(preset.sh) : '100');
  const [px, setPx] = uS(preset ? String(preset.avg) : '1100');
  const [fee, setFee] = uS('28');
  const buy = type === '買入';
  const ccy = preset ? preset.ccy : 'NT$';
  const total = (parseFloat(qty) || 0) * (parseFloat(px) || 0) + (buy ? (parseFloat(fee) || 0) : -(parseFloat(fee) || 0));

  return (
    <div className="aa-scrim" onClick={onClose}>
      <div className="aa-sheet" onClick={e => e.stopPropagation()}>
        <div className="aa-handle"></div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 2px 14px' }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.sub, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>取消</button>
          <span style={{ color: T.ink, fontWeight: 700, fontSize: 15 }}>新增交易</span>
          <button onClick={onSaved} style={{ background: 'none', border: 'none', color: accent, fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>儲存</button>
        </div>

        {/* 買入/賣出：依 App 主調配色（買入 紫→洋紅 / 賣出 藍→青） */}
        <div style={{ display: 'flex', gap: 4, padding: 4, background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.line}`, borderRadius: 13, marginBottom: 14 }}>
          {['買入', '賣出'].map(o => {
            const on = o === type;
            const grad = o === '買入' ? ['#7C5CE6', '#C24FD6'] : ['#2E74E6', '#35C6EA'];
            return <button key={o} onClick={() => setType(o)} style={{ flex: 1, padding: '9px 0', border: 'none', borderRadius: 9, cursor: 'pointer', fontFamily: 'inherit', fontWeight: on ? 800 : 600, fontSize: 14, background: on ? `linear-gradient(135deg, ${grad[0]}, ${grad[1]})` : 'transparent', color: on ? '#fff' : T.sub, boxShadow: on ? `0 6px 18px -8px ${grad[0]}` : 'none', transition: 'all .16s' }}>{o}</button>;
          })}
        </div>

        <Field label="股票代號">
          <span className="num" style={{ color: preset ? T.ink : T.faint, fontWeight: preset ? 700 : 400, fontSize: 14 }}>{preset ? `${preset.sym} ${preset.name}` : '輸入或搜尋（例：2330, AAPL）'}</span>
          <Icon id="chev" color={T.faint} size={16} />
        </Field>
        <Field label="帳戶">
          <span style={{ color: T.ink, fontSize: 14, fontWeight: 600 }}>{preset ? ACCT[preset.acct].name : '群益證券 主帳戶'}</span>
          <Icon id="chev" color={T.faint} size={16} />
        </Field>
        <Field label="交易日期">
          <span className="num" style={{ color: T.ink, fontSize: 14, fontWeight: 600 }}>2026 / 05 / 17</span>
          <Icon id="cal" color={T.faint} size={18} />
        </Field>
        <div style={{ display: 'flex', gap: 10 }}>
          <Field label="股數" flex><Input value={qty} onChange={setQty} unit="股" /></Field>
          <Field label={`單價（${ccy}）`} flex><Input value={px} onChange={setPx} /></Field>
        </div>
        <Field label={`手續費（${ccy}）`}><Input value={fee} onChange={setFee} /></Field>

        {/* 計算預覽 */}
        <Card glowAccent style={{ marginTop: 6, padding: 14, borderColor: accent + '55' }}>
          <div style={{ color: T.sub, fontSize: 11.5 }}>{buy ? '預估總成本' : '預估總收入'}</div>
          <div className="num" style={{ color: T.ink, fontSize: 23, fontWeight: 800, marginTop: 2 }}>{ccy} {nf(Math.round(total))}</div>
        </Card>
        <div style={{ height: 6 }}></div>
      </div>
    </div>
  );
}
function Field({ label, children, flex }) {
  return (
    <div style={{ marginBottom: 11, flex: flex ? 1 : 'none', minWidth: 0 }}>
      <div style={{ color: T.sub, fontSize: 11.5, marginBottom: 6 }}>{label}</div>
      <div className="aa-field">{children}</div>
    </div>
  );
}
function Input({ value, onChange, unit }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: 6 }}>
      <input className="num aa-input" value={value} inputMode="decimal" onChange={e => onChange(e.target.value.replace(/[^0-9.]/g, ''))} />
      {unit && <span style={{ color: T.sub, fontSize: 13 }}>{unit}</span>}
    </div>
  );
}

/* ======================================================================
   App
   ====================================================================== */
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#7C6CF0",
  "glow": true,
  "pnlColor": true
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [tab, setTab] = uS('holdings');
  const [detail, setDetail] = uS(null);
  const [sheet, setSheet] = uS(null);   // null | {preset}
  const [toast, setToast] = uS('');
  const ctx = { accent: t.accent, glow: t.glow, pnlColor: t.pnlColor };

  const flash = (m) => { setToast(m); setTimeout(() => setToast(''), 1900); };
  const save = () => { setSheet(null); flash('交易已新增（demo）'); };

  return (
    <AACtx.Provider value={ctx}>
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '34px 16px', '--aa': t.accent }}>
        <div>
          <div style={{ textAlign: 'center', marginBottom: 18 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: t.accent, fontWeight: 800, fontSize: 14, letterSpacing: '.02em' }}>
              <span style={{ width: 22, height: 22, borderRadius: 7, background: `linear-gradient(160deg, ${t.accent}, ${t.accent}aa)`, display: 'grid', placeItems: 'center', fontSize: 12, boxShadow: `0 6px 16px -6px ${t.accent}` }}>⚓</span>
              AssetAnchor
            </div>
            <div style={{ color: T.sub, fontSize: 12.5, marginTop: 6 }}>高保真 prototype · 持倉總覽流程 · 點持股進詳情、＋ 新增交易</div>
          </div>

          <div className="aa-phone">
            <StatusBar />
            <Home tab={tab} onTab={setTab} onRow={setDetail} onAdd={() => setSheet({})} />
            <TabBar active={tab} onChange={(id) => { setDetail(null); setTab(id); }} />
            {detail && <AssetDetail h={detail} onClose={() => setDetail(null)} onAdd={() => setSheet({ preset: detail })} />}
            {sheet && <AddTransaction preset={sheet.preset} onClose={() => setSheet(null)} onSaved={save} />}
            {toast && <div className="aa-toast">{toast}</div>}
          </div>
        </div>

        <TweaksPanel>
          <TweakSection label="視覺" />
          <TweakColor label="強調色" value={t.accent} options={['#4C6FE8', '#6C6CF0', '#7C6CF0', '#A368F0']} onChange={v => setTweak('accent', v)} />
          <TweakToggle label="卡片 / 圖表光暈" value={t.glow} onChange={v => setTweak('glow', v)} />
          <TweakToggle label="漲跌用紅綠色" value={t.pnlColor} onChange={v => setTweak('pnlColor', v)} />
        </TweaksPanel>
      </div>
    </AACtx.Provider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
