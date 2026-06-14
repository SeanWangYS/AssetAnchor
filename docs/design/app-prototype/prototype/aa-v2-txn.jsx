/* aa-v2-txn.jsx — v2 整合：交易 tab（時間軸 B）+ 交易詳情 + 日期篩選
   依賴 aa-core.jsx + aa-txn-data.jsx。FAB-only（無 header ＋）。 */

const { useState: vtS } = React;
const VT_RATE = window.ARATE || 30.95;

/* 日期區間 presets（demo 過濾） */
const VT_PRESETS = {
  '全部': () => true,
  '本月': t => t.mon === '6月',
  '近三月': t => t.mon !== '3月',
  '今年': () => true,
};

function VtGroupHeader({ label, n }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '15px 2px 6px' }}>
      <span style={{ color: T.ink, fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}>{label}</span>
      <span className="num" style={{ color: T.faint, fontSize: 11, whiteSpace: 'nowrap' }}>{n} 筆</span>
    </div>
  );
}

/* 時間軸 row（定稿 B） */
function VtRow({ t, showDate, onClick }) {
  const h = txHold(t);
  const sell = t.type === 'SELL';
  return (
    <div onClick={onClick} className="aa-row" style={{ display: 'grid', gridTemplateColumns: '40px 1fr auto', gap: 10, alignItems: 'center', padding: '9px 4px', cursor: 'pointer' }}>
      <div style={{ textAlign: 'center', alignSelf: 'start', paddingTop: 2 }}>
        {showDate && (
          <React.Fragment>
            <div className="num" style={{ color: T.ink, fontSize: 16, fontWeight: 800, lineHeight: 1 }}>{t.day}</div>
            <div style={{ color: T.faint, fontSize: 9, marginTop: 2 }}>{t.mon}</div>
          </React.Fragment>
        )}
      </div>
      <div style={{ minWidth: 0, borderLeft: `1px solid ${T.line}`, paddingLeft: 12 }}>
        <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
          <TxPill type={t.type} />
          <span style={{ color: T.ink, fontWeight: 600, fontSize: 14 }}>{h.name}</span>
          <span className="num" style={{ color: T.sub, fontSize: 11 }}>{t.sym}</span>
        </div>
        <div className="num" style={{ color: T.sub, fontSize: 11.5, marginTop: 3 }}>{txQtyPx(t)}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className="num" style={{ color: T.ink, fontWeight: 700, fontSize: 13.5, whiteSpace: 'nowrap' }}>{txFmt(txTotal(t), txCcy(t))}</div>
        {sell && <div style={{ marginTop: 2 }}><TxRealized t={t} size={10.5} /></div>}
      </div>
    </div>
  );
}

/* 交易 tab 主頁 */
function TxnPage({ onRow, onAdd, onToast }) {
  const [range, setRange] = vtS('全部');
  const [sheet, setSheet] = vtS(false);
  const pass = VT_PRESETS[range] || (() => true);
  const months = TX_MONTHS.map(g => ({ ...g, items: g.items.filter(pass) })).filter(g => g.items.length);

  return (
    <div style={{ flex: 1, overflowY: 'auto' }} className="aa-scroll">
      <div style={{ display: 'flex', alignItems: 'center', padding: '4px 20px 8px' }}>
        <div style={{ color: T.ink, fontSize: 23, fontWeight: 800, flex: 1, letterSpacing: '-.01em' }}>交易紀錄</div>
        <IconBtn id="cal" label="日期區間" onClick={() => setSheet(true)} />
      </div>
      <div style={{ padding: '0 20px 4px' }}>
        <span onClick={() => setSheet(true)} className="num" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 100, cursor: 'pointer',
          background: 'rgba(255,255,255,0.05)', border: `1px solid ${T.line}`, color: T.ink2, fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap',
        }}>期間：{range} <span style={{ color: T.faint, fontSize: 9 }}>▾</span></span>
      </div>
      <div style={{ padding: '0 20px 80px' }}>
        {months.length === 0 && <EmptyState icon="txn" title="沒有符合的交易" sub="調整日期區間試試" actionLabel="重設篩選" onAction={() => setRange('全部')} pad={56} />}
        {months.map(g => (
          <div key={g.label}>
            <VtGroupHeader label={g.label} n={g.items.length} />
            {g.items.map((t, i) => {
              const showDate = i === 0 || g.items[i - 1].d !== t.d;
              return <VtRow key={t.id} t={t} showDate={showDate} onClick={() => onRow(t)} />;
            })}
          </div>
        ))}
      </div>
      <TxFab onClick={onAdd} />
      {sheet && <VtFilterSheet range={range} onClose={() => setSheet(false)} onApply={(r, n) => { setRange(r); setSheet(false); onToast && onToast(`已套用「${r}」（${n} 筆）`); }} />}
    </div>
  );
}

/* 日期區間篩選（互動 sheet） */
function VtFilterSheet({ range, onClose, onApply }) {
  const { accent } = useAA();
  const [sel, setSel] = vtS(range);
  const presets = ['全部', '本月', '近三月', '今年'];
  const count = TXNS.filter(VT_PRESETS[sel] || (() => true)).length;
  return (
    <div className="aa-scrim" onClick={onClose}>
      <div className="aa-sheet" onClick={e => e.stopPropagation()}>
        <div className="aa-handle"></div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 14 }}>
          <span style={{ color: T.ink, fontWeight: 700, fontSize: 15 }}>日期區間</span>
          <span onClick={() => setSel('全部')} style={{ color: T.sub, fontSize: 13, cursor: 'pointer' }}>重設</span>
        </div>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {presets.map(p => {
            const on = p === sel;
            return <span key={p} onClick={() => setSel(p)} style={{
              padding: '7px 14px', borderRadius: 100, fontSize: 12, fontWeight: on ? 700 : 500, cursor: 'pointer',
              background: on ? `linear-gradient(160deg, ${accent}, ${accent}cc)` : 'transparent',
              border: `1px solid ${on ? 'transparent' : T.line2}`, color: on ? '#fff' : T.sub, transition: 'all .15s',
            }}>{p}</span>;
          })}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          {[['起', '2026 / 01 / 01'], ['訖', '2026 / 06 / 12']].map(([k, v]) => (
            <div key={k} style={{ flex: 1 }}>
              <div style={{ color: T.sub, fontSize: 11.5, marginBottom: 6 }}>{k}</div>
              <div className="aa-field"><span className="num" style={{ color: T.ink, fontSize: 13, fontWeight: 600 }}>{v}</span><Icon id="cal" color={T.faint} size={16} /></div>
            </div>
          ))}
        </div>
        <div onClick={() => onApply(sel, count)} style={{
          marginTop: 18, padding: '13px 0', borderRadius: 13, textAlign: 'center', cursor: 'pointer',
          background: `linear-gradient(160deg, ${accent}, ${accent}cc)`, color: '#fff', fontSize: 14, fontWeight: 800,
          boxShadow: `0 10px 24px -10px ${accent}`,
        }}>套用（{count} 筆）</div>
        <div style={{ height: 6 }}></div>
      </div>
    </div>
  );
}

/* 交易詳情（push） */
function VtKv({ k, v, last, strong }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8.5px 0', borderBottom: last ? 'none' : `1px solid ${T.line}` }}>
      <span style={{ color: T.sub, fontSize: 13 }}>{k}</span>
      <span className="num" style={{ color: T.ink, fontSize: strong ? 15 : 13.5, fontWeight: strong ? 800 : 600 }}>{v}</span>
    </div>
  );
}

function TxDetailScreen({ t, onClose, onEdit, onDelete }) {
  const { accent, pnlColor } = useAA();
  const h = txHold(t);
  const ccy = txCcy(t);
  const total = txTotal(t);
  const buy = t.type === 'BUY';
  const realCol = t.realized === undefined ? T.ink : pnlColor === false ? T.ink2 : t.realized >= 0 ? T.up : T.down;
  return (
    <div className="aa-push">
      <StatusBar />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 14px 10px', flex: '0 0 auto' }}>
        <IconBtn id="back" label="返回" onClick={onClose} />
        <div style={{ flex: 1, textAlign: 'center', color: T.ink, fontWeight: 700, fontSize: 15 }}>交易詳情</div>
        <IconBtn id="more" label="更多" />
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 20px 20px' }} className="aa-scroll">
        <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
          <Avatar h={h} size={48} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', gap: 7, alignItems: 'baseline' }}>
              <span style={{ color: T.ink, fontWeight: 700, fontSize: 17 }}>{h.name}</span>
              <span className="num" style={{ color: T.sub, fontSize: 13 }}>{t.sym}</span>
            </div>
            <div style={{ color: T.sub, fontSize: 11.5, marginTop: 3 }}>{h.mkt === 'TW' ? '台股' : '美股'} · {ACCT[t.acct].name}</div>
          </div>
          <TxPill type={t.type} size={12} />
        </div>

        <Card style={{ marginTop: 16 }}>
          <div style={{ color: T.ink, fontWeight: 700, fontSize: 14, marginBottom: 4 }}>交易內容</div>
          <VtKv k="交易日期" v={`2026 / ${t.d.replace('/', ' / ')}`} />
          <VtKv k="股數" v={`${nf(t.qty)} 股`} />
          <VtKv k="單價" v={txFmt(t.px, ccy, t.px % 1 ? 2 : 0)} />
          <VtKv k="手續費" v={txFmt(t.fee, ccy)} />
          <VtKv k={buy ? '總成本' : '總收入'} v={txFmt(total, ccy)} strong last={t.realized === undefined} />
          {t.realized !== undefined && (
            <VtKv k="已實現損益" v={<span style={{ color: realCol }}>{t.realized >= 0 ? '+' : '−'}{txFmt(Math.abs(t.realized), ccy)}</span>} last />
          )}
        </Card>

        <button onClick={onEdit} className="aa-ghost" style={{ marginTop: 14, borderColor: accent + '66', color: accent }}>編輯交易</button>
        <button onClick={onDelete} className="aa-ghost" style={{ marginTop: 9, borderColor: T.down + '55', color: T.down }}>刪除交易</button>
        <div style={{ color: T.faint, fontSize: 10.5, textAlign: 'center', marginTop: 8 }}>編輯會開啟與「新增交易」相同的 sheet 並帶入原值</div>
      </div>
    </div>
  );
}

/* 個股完整交易歷史（資產詳情 → push） */
function AssetTxHistoryScreen({ h, onClose, onRow }) {
  const list = TXNS.filter(t => t.sym === h.sym);
  const months = TX_MONTHS.map(g => ({ ...g, items: g.items.filter(t => t.sym === h.sym) })).filter(g => g.items.length);
  const buys = list.filter(t => t.type === 'BUY').reduce((s, t) => s + t.qty, 0);
  const sells = list.filter(t => t.type === 'SELL').reduce((s, t) => s + t.qty, 0);
  return (
    <div className="aa-push">
      <StatusBar />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 14px 10px', flex: '0 0 auto' }}>
        <IconBtn id="back" label="返回" onClick={onClose} />
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ color: T.ink, fontWeight: 700, fontSize: 15 }}><span className="num">{h.sym}</span> {h.name}</div>
          <div style={{ color: T.sub, fontSize: 11 }}>交易歷史 · {list.length} 筆</div>
        </div>
        <span style={{ width: 38 }}></span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }} className="aa-scroll">
        <div className="num" style={{ color: T.sub, fontSize: 11.5, padding: '2px 2px 0' }}>累計買入 {nf(buys)} 股 · 賣出 {nf(sells)} 股 · 現持 {nf(h.sh)} 股</div>
        {months.length === 0 && <EmptyState icon="txn" title="尚無交易紀錄" sub="新增第一筆交易後會顯示在這裡" pad={56} />}
        {months.map(g => (
          <div key={g.label}>
            <VtGroupHeader label={g.label} n={g.items.length} />
            {g.items.map((t, i) => {
              const showDate = i === 0 || g.items[i - 1].d !== t.d;
              return <VtRow key={t.id} t={t} showDate={showDate} onClick={() => onRow(t)} />;
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { TxnPage, TxDetailScreen, VtFilterSheet, AssetTxHistoryScreen });
