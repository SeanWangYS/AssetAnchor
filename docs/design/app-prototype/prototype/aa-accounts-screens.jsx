/* aa-accounts-screens.jsx — 帳戶管理：列表 / 詳情 / 新增表單 / 現金編輯（3 種互動）
   依賴 aa-core.jsx（T, HOLD, ACCT, nf, useAA, Card, Icon, IconBtn, Avatar, Pnl, StatusBar）。匯出至 window。 */

const { useState: acS } = React;

/* ============================ 資料（由 ACCT/HOLD 衍生） ============================ */
const ACC_META = {
  CAPITAL:   { broker: 'CAPITAL_SECURITIES', typeLabel: '證券戶', base: 'TWD', notes: '長期持有為主' },
  FIRSTRADE: { broker: 'FIRSTRADE',          typeLabel: '證券戶', base: 'USD', notes: '美股定期定額' },
  IBKR:      { broker: 'INTERACTIVE_BROKERS', typeLabel: '融資戶', base: 'USD', notes: '' },
  FUBON:     { broker: 'FUBON',              typeLabel: '證券戶', base: 'TWD', notes: 'ETF 專用' },
};
const ACC_LIST = Object.entries(ACCT).map(([id, a]) => {
  const list = HOLD.filter(h => h.acct === id);
  const ccy = a.mkt === 'TW' ? 'NT$' : 'US$';
  const val = list.reduce((s, h) => s + h.val, 0);
  return { id, ...a, ...ACC_META[id], ccy, val, n: list.length, holds: list, active: true };
});
/* 已停用示意帳戶 */
const ACC_INACTIVE = [{ id: 'SINOPAC', name: '永豐金證券', broker: 'SINOPAC', typeLabel: '證券戶', base: 'TWD', ccy: 'NT$', val: 0, n: 0, holds: [], active: false, cashTW: 0, cashUS: 0, color: '#888' }];

const accFmt = (v, ccy) => `${ccy} ${nf(v, ccy === 'US$' ? 2 : 0)}`;

/* ============================ 共用 ============================ */
function AccScreen({ children, fill, tint }) {
  const { accent, acctTint } = useAA();
  const glowCol = acctTint !== false && tint ? tint : accent;
  return (
    <div style={{
      width: '100%', height: fill ? '100%' : 'auto', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative',
      background: `radial-gradient(420px 280px at 50% -6%, color-mix(in srgb, ${glowCol} 17%, transparent), transparent 70%), #0E1117`,
      color: '#fff',
    }}>{children}</div>
  );
}

function AccHeader({ title, sub, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 14px 10px', flex: '0 0 auto' }}>
      <IconBtn id="back" label="返回" />
      <div style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
        <div style={{ color: T.ink, fontWeight: 700, fontSize: 15 }}>{title}</div>
        {sub && <div style={{ color: T.sub, fontSize: 11 }}>{sub}</div>}
      </div>
      {right || <span style={{ width: 38 }}></span>}
    </div>
  );
}

/* 設定 tab active 的 tab bar */
function AccPieIcon({ color, size = 22 }) {
  return (
    <svg viewBox="0 0 21 21" width={size} height={size}>
      <circle cx="10.5" cy="10.5" r="7.6" fill="none" stroke={color} strokeWidth="1.8"></circle>
      <path d="M10.5 10.5V2.9M10.5 10.5l6.6 3.9" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round"></path>
    </svg>
  );
}
function AccTabBar() {
  const { accent } = useAA();
  const tabs = [{ id: 'holdings', label: '持倉' }, { id: 'txn', label: '交易' }, { id: 'analysis', label: '分析' }, { id: 'settings', label: '設定' }];
  return (
    <div style={{ flex: '0 0 auto', display: 'flex', borderTop: `1px solid ${T.line}`, background: 'rgba(12,14,19,0.86)', backdropFilter: 'blur(12px)', paddingBottom: 8, marginTop: 'auto' }}>
      {tabs.map(t => {
        const on = t.id === 'settings';
        const col = on ? accent : T.faint;
        return (
          <div key={t.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '9px 0 4px' }}>
            {t.id === 'analysis' ? <AccPieIcon color={col} /> : <Icon id={t.id} color={col} />}
            <span style={{ fontSize: 10, color: on ? accent : T.sub, fontWeight: on ? 700 : 500 }}>{t.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/* 新增帳戶 FAB */
function AccFab({ onClick }) {
  const { accent } = useAA();
  return (
    <div style={{ position: 'absolute', right: 18, bottom: 86, zIndex: 20 }}>
      <div onClick={onClick} style={{
        width: 52, height: 52, borderRadius: '50%', display: 'grid', placeItems: 'center',
        background: `linear-gradient(160deg, ${accent}, ${accent}cc)`,
        boxShadow: `0 4px 8px 3px rgba(0,0,0,0.4), 0 10px 26px -8px ${accent}`, cursor: 'pointer',
      }}>
        <Icon id="plus" color="#fff" size={24} />
      </div>
    </div>
  );
}

/* 帳戶 monogram：使用中帳戶帶識別色，停用為中性灰 */
function AccMono({ name, size = 38, dim, color }) {
  if (color && !dim) {
    return (
      <div style={{
        width: size, height: size, borderRadius: '50%', flex: '0 0 auto', display: 'grid', placeItems: 'center',
        background: `linear-gradient(150deg, ${color}, ${color}cc)`,
        color: '#fff', fontWeight: 800, fontSize: 14,
        boxShadow: `0 4px 12px -4px ${color}99, inset 0 1px 0 rgba(255,255,255,.18)`,
      }}>{name[0]}</div>
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flex: '0 0 auto', display: 'grid', placeItems: 'center',
      background: 'rgba(255,255,255,0.07)', border: `1px solid ${T.line2}`,
      color: dim ? T.faint : T.ink2, fontWeight: 700, fontSize: 14,
    }}>{name[0]}</div>
  );
}

function AccKv({ k, v, last, strong }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: last ? 'none' : `1px solid ${T.line}` }}>
      <span style={{ color: T.sub, fontSize: 13 }}>{k}</span>
      <span className="num" style={{ color: T.ink, fontSize: strong ? 14.5 : 13.5, fontWeight: strong ? 800 : 600 }}>{v}</span>
    </div>
  );
}

/* ======================================================================
   帳戶列表（設定 → 帳戶管理）
   ====================================================================== */
function AccRow({ a, onClick }) {
  return (
    <div onClick={onClick} className="aa-row" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 6px', borderTop: `1px solid ${T.line}`, cursor: 'pointer', opacity: a.active ? 1 : 0.55 }}>
      <AccMono name={a.name} dim={!a.active} color={a.color} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: T.ink, fontWeight: 600, fontSize: 14.5 }}>{a.name}</div>
        <div style={{ color: T.sub, fontSize: 11, marginTop: 2 }}>{a.typeLabel} · {a.mkt === 'TW' ? '台股' : '美股'}</div>
      </div>
      <div style={{ textAlign: 'right', flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div className="num" style={{ color: a.active ? T.ink : T.faint, fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap' }}>
          {a.active ? accFmt(a.val, a.ccy) : '—'}
        </div>
        <Icon id="chev" color={T.faint} size={15} />
      </div>
    </div>
  );
}

function AccountList() {
  return (
    <AccScreen fill>
      <StatusBar />
      <AccHeader title="帳戶管理" sub="4 個使用中" />
      <div style={{ flex: 1, padding: '4px 20px 0', minHeight: 0 }}>
        <div style={{ color: T.sub, fontSize: 11.5, fontWeight: 600, padding: '6px 2px' }}>使用中</div>
        {ACC_LIST.map(a => <AccRow key={a.id} a={a} />)}
        <div style={{ color: T.sub, fontSize: 11.5, fontWeight: 600, padding: '20px 2px 6px' }}>已停用</div>
        {ACC_INACTIVE.map(a => <AccRow key={a.id} a={a} />)}
        <div style={{ color: T.faint, fontSize: 10.5, padding: '10px 2px' }}>市值為該帳戶持股小計（原幣別）。長按可拖曳排序。</div>
      </div>
      <AccFab />
      <AccTabBar />
    </AccScreen>
  );
}

/* ======================================================================
   帳戶詳情（群益示例；頂部光暈 = 帳戶色微調）
   ====================================================================== */
function AccountDetail({ cashEditing, onCashRender }) {
  const { accent } = useAA();
  const a = ACC_LIST[0]; // 群益
  const totalCash = a.cashTW; // TWD 戶頭示例
  return (
    <AccScreen tint={a.color}>
      <StatusBar />
      <AccHeader title={a.name} sub={`${a.typeLabel} · 基礎幣別 ${a.base}`} right={<IconBtn id="more" label="更多" />} />
      <div style={{ padding: '0 20px 18px' }}>
        {/* hero：帳戶總值 */}
        <div style={{ paddingTop: 2 }}>
          <div style={{ color: T.sub, fontSize: 12.5 }}>帳戶總值（TWD）</div>
          <div className="num" style={{ color: T.ink, fontSize: 30, fontWeight: 800, letterSpacing: '-.02em', marginTop: 2 }}>NT$ {nf(a.val + totalCash)}</div>
          <div className="num" style={{ color: T.sub, fontSize: 11.5, marginTop: 4 }}>持股 NT$ {nf(a.val)} · 現金 NT$ {nf(totalCash)}</div>
        </div>

        {/* 現金餘額卡（onCashRender 讓 3 種編輯互動替換內容） */}
        {onCashRender ? onCashRender(a) : <CashCard a={a} />}

        {/* 持股 */}
        <Card style={{ marginTop: 12, padding: '10px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '4px 0 2px' }}>
            <span style={{ color: T.ink, fontSize: 13.5, fontWeight: 700 }}>持股</span>
            <span className="num" style={{ color: T.faint, fontSize: 10.5 }}>{a.n} 檔</span>
          </div>
          {a.holds.map(h => (
            <div key={h.sym} className="aa-row" style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 0', borderTop: `1px solid ${T.line}`, cursor: 'pointer' }}>
              <Avatar h={h} size={32} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
                  <span style={{ color: T.ink, fontWeight: 600, fontSize: 13.5 }}>{h.name}</span>
                  <span className="num" style={{ color: T.sub, fontSize: 11 }}>{h.sym}</span>
                </div>
                <div className="num" style={{ color: T.sub, fontSize: 11, marginTop: 2 }}>{h.sh} 股 · 均價 {h.ccy}{nf(h.avg)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="num" style={{ color: T.ink, fontWeight: 700, fontSize: 13 }}>{accFmt(h.val, h.ccy)}</div>
                <div style={{ marginTop: 2 }}><Pnl pct={h.pct} size={11} /></div>
              </div>
            </div>
          ))}
        </Card>

        {/* 帳戶資訊 */}
        <Card style={{ marginTop: 12 }}>
          <div style={{ color: T.ink, fontWeight: 700, fontSize: 13.5, marginBottom: 4 }}>帳戶資訊</div>
          <AccKv k="券商" v={`${a.name}（${a.broker}）`} />
          <AccKv k="帳戶類型" v={a.typeLabel} />
          <AccKv k="基礎幣別" v={a.base} />
          <AccKv k="備註" v={a.notes || '—'} last />
        </Card>

        {/* 動作 */}
        <button className="acc-ghost" style={{ marginTop: 14 }}>停用帳戶</button>
        <button className="acc-ghost" style={{ marginTop: 9, borderColor: T.down + '55', color: T.down }}>刪除帳戶</button>
        <div style={{ color: T.faint, fontSize: 10.5, textAlign: 'center', marginTop: 8 }}>刪除前需先處理該帳戶的交易紀錄；停用為軟刪除（可復原）</div>
      </div>
      <AccTabBar />
    </AccScreen>
  );
}

/* 現金餘額卡（檢視態） */
function CashCard({ a, editBtn = true }) {
  const { accent } = useAA();
  return (
    <Card style={{ marginTop: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ color: T.ink, fontWeight: 700, fontSize: 13.5 }}>現金餘額</span>
        {editBtn && <span style={{ color: accent, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>編輯</span>}
      </div>
      <AccKv k="TWD 現金" v={`NT$ ${nf(a.cashTW)}`} />
      <AccKv k="USD 現金" v={`US$ ${nf(a.cashUS, 2)}`} last />
      <div style={{ color: T.faint, fontSize: 10, marginTop: 8 }}>手動快照 · 更新於 2026/06/10 21:14</div>
    </Card>
  );
}

Object.assign(window, {
  ACC_LIST, ACC_INACTIVE, accFmt,
  AccScreen, AccHeader, AccTabBar, AccFab, AccMono, AccKv, AccRow,
  AccountList, AccountDetail, CashCard, AccPieIcon,
});
