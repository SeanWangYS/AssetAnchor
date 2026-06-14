/* aa-screens-v2.jsx — v2：新導航（持倉/交易/分析/設定，帳戶併入設定）
   Home(B 儀表板) + AssetDetail + AddTransaction + AnalysisPage + SettingsScreen + App */

const { useState: uS, useEffect: uE, useRef: uR } = React;
const RATE = window.ARATE || 30.95; // USD -> TWD（demo）

/* ============================ 新導航 tab bar ============================ */
const TABS2 = [
  { id: 'holdings', label: '持倉' },
  { id: 'txn', label: '交易' },
  { id: 'analysis', label: '分析' },
  { id: 'settings', label: '設定' },
];
function TabBar2({ active, onChange }) {
  const { accent } = useAA();
  return (
    <div style={{ flex: '0 0 auto', display: 'flex', borderTop: `1px solid ${T.line}`, background: 'rgba(12,14,19,0.86)', backdropFilter: 'blur(12px)', paddingBottom: 8 }}>
      {TABS2.map(t => {
        const on = t.id === active;
        const col = on ? accent : T.faint;
        return (
          <button key={t.id} onClick={() => onChange(t.id)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '9px 0 4px', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            {t.id === 'analysis' ? <AnalysisPieIcon color={col} /> : <Icon id={t.id} color={col} />}
            <span style={{ fontSize: 10, color: on ? accent : T.sub, fontWeight: on ? 700 : 500 }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ============================ 首頁構件（同 v1） ============================ */
function StatCell({ label, children, accentGlow }) {
  return (
    <Card glowAccent={accentGlow} style={{ padding: 13, borderRadius: 16 }}>
      <div style={{ color: T.sub, fontSize: 11.5, fontWeight: 500 }}>{label}</div>
      <div style={{ marginTop: 7 }}>{children}</div>
    </Card>
  );
}

function GroupHeader({ label, sub, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '15px 2px 7px' }}>
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

/* ============================ 設定（帳戶管理併入） ============================ */
function SRow({ label, sub, badge, last, accent, onClick }) {
  return (
    <div onClick={onClick} className="aa-row" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 2px', borderBottom: last ? 'none' : `1px solid ${T.line}`, cursor: 'pointer' }}>
      <span style={{ color: T.ink, fontSize: 14, fontWeight: 600 }}>{label}</span>
      {badge && <span style={{ fontSize: 9.5, fontWeight: 700, color: accent, border: `1px solid ${accent}55`, background: `${accent}1a`, padding: '2px 7px', borderRadius: 100 }}>{badge}</span>}
      <span style={{ marginLeft: 'auto', color: T.sub, fontSize: 12.5 }}>{sub}</span>
      <Icon id="chev" color={T.faint} size={15} />
    </div>
  );
}
function SLabel({ children }) {
  return <div style={{ color: T.sub, fontSize: 11.5, fontWeight: 600, margin: '18px 2px 8px' }}>{children}</div>;
}
function SettingsScreen({ onAccounts, onLogout, userEmail = 'sean@example.com' }) {
  const { accent } = useAA();
  return (
    <div style={{ flex: 1, overflowY: 'auto' }} className="aa-scroll">
      <div style={{ display: 'flex', alignItems: 'center', padding: '4px 20px 8px' }}>
        <div style={{ color: T.ink, fontSize: 23, fontWeight: 800, flex: 1, letterSpacing: '-.01em' }}>設定</div>
      </div>
      <div style={{ padding: '0 20px 20px' }}>
        {/* 帳號身分卡 */}
        <Card style={{ display: 'flex', alignItems: 'center', gap: 13, padding: 15 }}>
          <AALogoMark size={42} />
          <div style={{ minWidth: 0 }}>
            <div style={{ color: T.ink, fontSize: 15, fontWeight: 700 }}>我的帳號</div>
            <div className="num" style={{ color: T.sub, fontSize: 12.5, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userEmail}</div>
          </div>
        </Card>

        <SLabel>帳戶</SLabel>
        <Card style={{ padding: '2px 16px' }}>
          <SRow label="帳戶管理" sub="4 個帳戶" badge="原「帳戶」tab" accent={accent} onClick={onAccounts} />
          <SRow label="現金餘額" sub="NT$ 245,800 · US$ 3,250" last onClick={onAccounts} />
        </Card>
        <div style={{ color: T.faint, fontSize: 10.5, margin: '8px 2px 0' }}>導航變更：帳戶管理自主導航併入設定，原位置改為「分析」。</div>

        <SLabel>偏好</SLabel>
        <Card style={{ padding: '2px 16px' }}>
          <SRow label="顯示偏好" sub="TWD · 深色" />
          <SRow label="個人資料" sub={userEmail} last />
        </Card>

        <SLabel>其他</SLabel>
        <Card style={{ padding: '2px 16px' }}>
          <SRow label="關於 AssetAnchor" sub="v0.2.0（demo）" last />
        </Card>

        <button onClick={onLogout} style={{
          width: '100%', marginTop: 22, padding: '13px 0', borderRadius: 13, cursor: 'pointer', fontFamily: 'inherit',
          background: 'rgba(255,94,98,0.08)', border: '1px solid rgba(255,94,98,0.28)', color: T.down, fontSize: 14, fontWeight: 700,
        }}>登出</button>
        <div style={{ textAlign: 'center', color: T.faint, fontSize: 10.5, marginTop: 14 }}>AssetAnchor v0.2.0 · demo prototype</div>
      </div>
    </div>
  );
}

/* ============================ 首頁 ============================ */
function Home({ onRow, onAdd, onTab, onToast, onTxRow, onAccounts, onLogout, userEmail, tab }) {
  const { accent } = useAA();
  const [tf, setTf] = uS('1Y');
  const [seg, setSeg] = uS('持股');
  const total = useCountUp(SUM.total, 950);

  if (tab === 'analysis') return <AnalysisPage onToast={onToast} />;
  if (tab === 'settings') return <SettingsScreen onAccounts={onAccounts} onLogout={onLogout} userEmail={userEmail} />;
  if (tab === 'txn') return <TxnPage onRow={onTxRow} onAdd={onAdd} onToast={onToast} />;

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

/* ============================ 資產詳情（push） ============================ */
function AssetDetail({ h, onClose, onAdd, onHistory }) {
  const { accent } = useAA();
  const [tf, setTf] = uS('1M');
  const [ccy, setCcy] = uS(h.ccy === 'US$' ? 'USD' : 'TWD');
  const cost = h.avg * h.sh;
  const unreal = h.val - cost;
  const acct = ACCT[h.acct];

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
        <button onClick={onHistory} className="aa-ghost" style={{ marginTop: 10 }}>查看完整交易歷史</button>
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

/* ============================ 新增交易（bottom sheet） ============================ */
function AddTransaction({ onClose, onSaved, preset, edit }) {
  const { accent } = useAA();
  const [type, setType] = uS(edit && preset && preset.txType === 'SELL' ? '賣出' : '買入');
  const [qty, setQty] = uS(preset ? String(preset.qty !== undefined ? preset.qty : preset.sh) : '100');
  const [px, setPx] = uS(preset ? String(preset.px !== undefined ? preset.px : preset.avg) : '1100');
  const [fee, setFee] = uS(preset && preset.fee !== undefined ? String(preset.fee) : '28');
  const buy = type === '買入';
  const ccy = preset ? preset.ccy : 'NT$';
  const total = (parseFloat(qty) || 0) * (parseFloat(px) || 0) + (buy ? (parseFloat(fee) || 0) : -(parseFloat(fee) || 0));
  const usd = ccy === 'US$' ? total : total / RATE;

  return (
    <div className="aa-scrim" onClick={onClose}>
      <div className="aa-sheet" onClick={e => e.stopPropagation()}>
        <div className="aa-handle"></div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 2px 14px' }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.sub, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>取消</button>
          <span style={{ color: T.ink, fontWeight: 700, fontSize: 15 }}>{edit ? '編輯交易' : '新增交易'}</span>
          <button onClick={onSaved} style={{ background: 'none', border: 'none', color: accent, fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>儲存</button>
        </div>

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
          <span className="num" style={{ color: T.ink, fontSize: 14, fontWeight: 600 }}>{preset && preset.d ? `2026 / ${preset.d.replace('/', ' / ')}` : '2026 / 06 / 12'}</span>
          <Icon id="cal" color={T.faint} size={18} />
        </Field>
        <div style={{ display: 'flex', gap: 10 }}>
          <Field label="股數" flex><Input value={qty} onChange={setQty} unit="股" /></Field>
          <Field label={`單價（${ccy}）`} flex><Input value={px} onChange={setPx} /></Field>
        </div>
        <Field label={`手續費（${ccy}）`}><Input value={fee} onChange={setFee} /></Field>

        <Card glowAccent style={{ marginTop: 6, padding: 14, borderColor: accent + '55' }}>
          <div style={{ color: T.sub, fontSize: 11.5 }}>{buy ? '預估總成本' : '預估總收入'}</div>
          <div className="num" style={{ color: T.ink, fontSize: 23, fontWeight: 800, marginTop: 2 }}>{ccy} {nf(Math.round(total))}</div>
          <div className="num" style={{ color: T.faint, fontSize: 11, marginTop: 3 }}>換算 US$ {nf(usd, 2)}（匯率 {RATE} · 2026/06/12）</div>
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

/* ============================ App ============================ */
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#7C6CF0",
  "glow": true,
  "pnlColor": true,
  "donut": true,
  "acctTint": true
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [tab, setTab] = uS('holdings');
  const [booting, setBooting] = uS(true);
  const [authed, setAuthed] = uS(false);
  const [userEmail, setUserEmail] = uS('sean@example.com');
  const [detail, setDetail] = uS(null);
  const [txDetail, setTxDetail] = uS(null);
  const [acctList, setAcctList] = uS(false);
  const [acctDetail, setAcctDetail] = uS(null);
  const [acctForm, setAcctForm] = uS(false);
  const [txHistory, setTxHistory] = uS(null);
  const [confirm, setConfirm] = uS(null);
  const [sheet, setSheet] = uS(null);
  const [toast, setToast] = uS('');
  const ctx = { accent: t.accent, glow: t.glow, pnlColor: t.pnlColor, donut: t.donut, acctTint: t.acctTint };

  const flash = (m) => { setToast(m); setTimeout(() => setToast(''), 1900); };
  const save = () => { const wasEdit = sheet && sheet.edit; setSheet(null); flash(wasEdit ? '交易已更新（demo）' : '交易已新增（demo）'); };
  const editTxn = () => {
    const h = txHold(txDetail);
    setSheet({ edit: true, preset: { ...h, acct: txDetail.acct, qty: txDetail.qty, px: txDetail.px, fee: txDetail.fee, d: txDetail.d, txType: txDetail.type } });
  };
  const switchTab = (id) => { setDetail(null); setTxDetail(null); setAcctList(false); setAcctDetail(null); setTxHistory(null); setConfirm(null); setTab(id); };

  // splash gate：擋 auth 狀態閃現（真實 app 為 Firebase onAuthStateChanged 解決前）
  uE(() => { const tmr = setTimeout(() => setBooting(false), 1300); return () => clearTimeout(tmr); }, []);
  const login = (email) => { if (email) setUserEmail(email); switchTab('holdings'); setAuthed(true); };
  const logout = () => setConfirm({
    title: '登出 AssetAnchor？', message: '登出後需要重新登入才能查看你的投資組合。', label: '登出', danger: true,
    action: () => { setConfirm(null); switchTab('holdings'); setAuthed(false); },
  });

  return (
    <AACtx.Provider value={ctx}>
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '34px 16px', '--aa': t.accent }}>
        <div>
          <div style={{ textAlign: 'center', marginBottom: 18 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
              <AALogoMark size={26} glow={false} />
              <AAWordmark size={18} />
              <span style={{ fontWeight: 600, fontSize: 11, color: T.sub }}>v2</span>
            </div>
            <div style={{ color: T.sub, fontSize: 12.5, marginTop: 7 }}>Auth → 持倉＋分析＋交易＋帳戶管理 · 新導航</div>
          </div>

          <div className="aa-phone">
            {booting && <SplashGate />}
            {!booting && !authed && (
              <React.Fragment>
                <StatusBar />
                <AuthFlow onAuthed={login} onSkip={() => login('sean@example.com')} />
              </React.Fragment>
            )}
            {!booting && authed && (<React.Fragment>
            <StatusBar />
            <Home tab={tab} onTab={setTab} onRow={setDetail} onTxRow={setTxDetail} onAccounts={() => setAcctList(true)} onAdd={() => setSheet({})} onToast={flash} onLogout={logout} userEmail={userEmail} />
            <TabBar2 active={tab} onChange={switchTab} />
            {detail && <AssetDetail h={detail} onClose={() => setDetail(null)} onAdd={() => setSheet({ preset: detail })} onHistory={() => setTxHistory(detail)} />}
            {txHistory && <AssetTxHistoryScreen h={txHistory} onClose={() => setTxHistory(null)} onRow={setTxDetail} />}
            {txDetail && <TxDetailScreen t={txDetail} onClose={() => setTxDetail(null)} onEdit={editTxn} onDelete={() => setConfirm({
              title: '刪除這筆交易？', message: '刪除後持倉與報酬會重新計算，無法復原。', label: '刪除', danger: true,
              action: () => { setConfirm(null); setTxDetail(null); flash('交易已刪除（demo）'); },
            })} />}
            {acctList && <AccountListScreen onClose={() => setAcctList(false)} onRow={a => setAcctDetail(a)} onAdd={() => setAcctForm(true)} />}
            {acctDetail && <AccountDetailScreen a={acctDetail} onClose={() => setAcctDetail(null)} onToast={flash} onConfirm={(c) => setConfirm({ ...c, action: c.action ? () => { setConfirm(null); c.action(); } : undefined })} />}
            {sheet && <AddTransaction preset={sheet.preset} edit={sheet.edit} onClose={() => setSheet(null)} onSaved={save} />}
            {acctForm && <AccountFormSheetLive onClose={() => setAcctForm(false)} onSaved={() => { setAcctForm(false); flash('帳戶已新增（demo）'); }} />}
            {confirm && <ConfirmDialog title={confirm.title} message={confirm.message} label={confirm.label} danger={confirm.danger} onAction={confirm.action} onClose={() => setConfirm(null)} />}
            {toast && <div className="aa-toast">{toast}</div>}
            </React.Fragment>)}
          </div>
        </div>

        <TweaksPanel>
          <TweakSection label="視覺" />
          <TweakColor label="強調色" value={t.accent} options={['#4C6FE8', '#6C6CF0', '#7C6CF0', '#A368F0']} onChange={v => setTweak('accent', v)} />
          <TweakToggle label="甜甜圈（關＝實心圓餅）" value={t.donut} onChange={v => setTweak('donut', v)} />
          <TweakToggle label="卡片 / 圖表光暈" value={t.glow} onChange={v => setTweak('glow', v)} />
          <TweakToggle label="帳戶色（圓標／詳情光暈）" value={t.acctTint} onChange={v => setTweak('acctTint', v)} />
          <TweakToggle label="漲跌用紅綠色" value={t.pnlColor} onChange={v => setTweak('pnlColor', v)} />
        </TweaksPanel>
      </div>
    </AACtx.Provider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
