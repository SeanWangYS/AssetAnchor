/* aa-txn-data.jsx — 交易紀錄：mock 交易資料 + 共用構件
   依賴 aa-core.jsx（T, HOLD, ACCT, nf, useAA, Icon）。匯出至 window。 */

/* 買/賣 主題漸層（與新增交易 sheet 一致） */
const TX_GRAD = { BUY: ['#7C5CE6', '#C24FD6'], SELL: ['#2E74E6', '#35C6EA'] };
const TX_LABEL = { BUY: '買入', SELL: '賣出' };

/* mock 交易（今天 = 2026-06-12）。realized = 已實現損益（賣出，含費稅後） */
const TXNS = [
  { id: 1,  sym: '2330',  type: 'BUY',  d: '06/12', day: '12', mon: '6月', qty: 10,  px: 1100,   fee: 28,   acct: 'CAPITAL' },
  { id: 2,  sym: 'VTI',   type: 'BUY',  d: '06/11', day: '11', mon: '6月', qty: 2,   px: 251.0,  fee: 0,    acct: 'IBKR' },
  { id: 3,  sym: 'AAPL',  type: 'SELL', d: '06/09', day: '09', mon: '6月', qty: 3,   px: 214.1,  fee: 0.02, acct: 'FIRSTRADE', realized: 100.78 },
  { id: 4,  sym: '00878', type: 'BUY',  d: '06/05', day: '05', mon: '6月', qty: 200, px: 20.9,   fee: 20,   acct: 'FUBON' },
  { id: 5,  sym: 'QQQ',   type: 'BUY',  d: '05/28', day: '28', mon: '5月', qty: 2,   px: 442.0,  fee: 0,    acct: 'FIRSTRADE' },
  { id: 6,  sym: '0050',  type: 'SELL', d: '05/20', day: '20', mon: '5月', qty: 100, px: 145.0,  fee: 64,   acct: 'FUBON', realized: 222 },
  { id: 7,  sym: '2317',  type: 'BUY',  d: '05/15', day: '15', mon: '5月', qty: 50,  px: 186.0,  fee: 20,   acct: 'CAPITAL' },
  { id: 8,  sym: 'AAPL',  type: 'BUY',  d: '05/08', day: '08', mon: '5月', qty: 2,   px: 205.3,  fee: 0,    acct: 'FIRSTRADE' },
  { id: 9,  sym: '2330',  type: 'BUY',  d: '04/24', day: '24', mon: '4月', qty: 20,  px: 980,    fee: 55,   acct: 'CAPITAL' },
  { id: 10, sym: '2317',  type: 'SELL', d: '04/10', day: '10', mon: '4月', qty: 50,  px: 171.5,  fee: 24,   acct: 'CAPITAL', realized: -375 },
  { id: 11, sym: '0050',  type: 'BUY',  d: '04/03', day: '03', mon: '4月', qty: 100, px: 139.5,  fee: 62,   acct: 'FUBON' },
  { id: 12, sym: 'VTI',   type: 'BUY',  d: '03/27', day: '27', mon: '3月', qty: 3,   px: 243.8,  fee: 0,    acct: 'IBKR' },
];

/* 依日期分組（今天 / 本週 / 按月） */
const TX_GROUPS = [
  { label: '今天', ids: [1] },
  { label: '本週', ids: [2, 3] },
  { label: '六月', ids: [4] },
  { label: '五月', ids: [5, 6, 7, 8] },
  { label: '四月', ids: [9, 10, 11] },
  { label: '三月', ids: [12] },
].map(g => ({ ...g, items: g.ids.map(id => TXNS.find(t => t.id === id)) }));

/* 依月分組（timeline 版型用） */
const TX_MONTHS = ['6月', '5月', '4月', '3月'].map(m => ({ label: m === '6月' ? '六月' : m === '5月' ? '五月' : m === '4月' ? '四月' : '三月', items: TXNS.filter(t => t.mon === m) }));

/* helpers */
const txHold = (t) => HOLD.find(h => h.sym === t.sym);
const txCcy = (t) => txHold(t).ccy;
const txTotal = (t) => t.qty * t.px + (t.type === 'BUY' ? t.fee : -t.fee);
const txFmt = (v, ccy, d) => `${ccy} ${nf(v, d !== undefined ? d : (ccy === 'US$' ? 2 : 0))}`;
const txQtyPx = (t) => `${nf(t.qty)} 股 × ${txFmt(t.px, txCcy(t), t.px % 1 ? 2 : 0)}`;

/* 買/賣 小膠囊 */
function TxPill({ type, size = 10 }) {
  const g = TX_GRAD[type];
  return (
    <span style={{
      display: 'inline-block', padding: size > 10 ? '3px 10px' : '2px 8px', borderRadius: 100,
      background: `linear-gradient(135deg, ${g[0]}, ${g[1]})`, color: '#fff',
      fontSize: size, fontWeight: 800, letterSpacing: '.04em', whiteSpace: 'nowrap',
    }}>{TX_LABEL[type]}</span>
  );
}

/* 已實現損益小字 */
function TxRealized({ t, size = 11 }) {
  const { pnlColor } = useAA();
  if (t.realized === undefined) return null;
  const up = t.realized >= 0;
  const col = pnlColor === false ? T.ink2 : up ? T.up : T.down;
  return (
    <span className="num" style={{ color: col, fontSize: size, fontWeight: 700, whiteSpace: 'nowrap' }}>
      已實現 {up ? '+' : '−'}{txFmt(Math.abs(t.realized), txCcy(t))}
    </span>
  );
}

/* 交易 tab 為 active 的 tab bar（新導航） */
function TxPieIcon({ color, size = 22 }) {
  return (
    <svg viewBox="0 0 21 21" width={size} height={size}>
      <circle cx="10.5" cy="10.5" r="7.6" fill="none" stroke={color} strokeWidth="1.8"></circle>
      <path d="M10.5 10.5V2.9M10.5 10.5l6.6 3.9" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round"></path>
    </svg>
  );
}
const TX_TABS = [
  { id: 'holdings', label: '持倉' },
  { id: 'txn', label: '交易' },
  { id: 'analysis', label: '分析' },
  { id: 'settings', label: '設定' },
];
function TxTabBar() {
  const { accent } = useAA();
  return (
    <div style={{ flex: '0 0 auto', display: 'flex', borderTop: `1px solid ${T.line}`, background: 'rgba(12,14,19,0.86)', backdropFilter: 'blur(12px)', paddingBottom: 8, marginTop: 'auto' }}>
      {TX_TABS.map(t => {
        const on = t.id === 'txn';
        const col = on ? accent : T.faint;
        return (
          <div key={t.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '9px 0 4px' }}>
            {t.id === 'analysis' ? <TxPieIcon color={col} /> : <Icon id={t.id} color={col} />}
            <span style={{ fontSize: 10, color: on ? accent : T.sub, fontWeight: on ? 700 : 500 }}>{t.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/* FAB（新增交易，Tweaks 可關） */
function TxFab({ onClick }) {
  const { accent, fab } = useAA();
  if (fab === false) return null;
  return (
    <div style={{ position: 'absolute', right: 18, bottom: 86, zIndex: 20 }}>
      <div onClick={onClick} style={{
        width: 52, height: 52, borderRadius: '50%', display: 'grid', placeItems: 'center',
        background: `linear-gradient(160deg, ${accent}, ${accent}cc)`,
        boxShadow: `0 4px 8px 3px rgba(0,0,0,0.4), 0 10px 26px -8px ${accent}`,
        cursor: 'pointer',
      }}>
        <Icon id="plus" color="#fff" size={24} />
      </div>
    </div>
  );
}

Object.assign(window, {
  TX_GRAD, TX_LABEL, TXNS, TX_GROUPS, TX_MONTHS,
  txHold, txCcy, txTotal, txFmt, txQtyPx,
  TxPill, TxRealized, TxPieIcon, TxTabBar, TxFab,
});
