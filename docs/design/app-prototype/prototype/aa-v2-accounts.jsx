/* aa-v2-accounts.jsx — v2 整合：設定 → 帳戶管理（列表 / 詳情含 inline 現金編輯 / 新增表單）
   依賴 aa-core.jsx + aa-accounts-screens.jsx（ACC_LIST, AccMono, AccKv, accFmt…）。 */

const { useState: vaS } = React;

/* 帳戶列表（push） */
function AccountListScreen({ onClose, onRow, onAdd }) {
  return (
    <div className="aa-push">
      <StatusBar />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 14px 10px', flex: '0 0 auto' }}>
        <IconBtn id="back" label="返回" onClick={onClose} />
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ color: T.ink, fontWeight: 700, fontSize: 15 }}>帳戶管理</div>
          <div style={{ color: T.sub, fontSize: 11 }}>{ACC_LIST.length} 個使用中</div>
        </div>
        <span style={{ width: 38 }}></span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 20px 90px' }} className="aa-scroll">
        <div style={{ color: T.sub, fontSize: 11.5, fontWeight: 600, padding: '6px 2px' }}>使用中</div>
        {ACC_LIST.map(a => <AccRow key={a.id} a={a} onClick={() => onRow(a)} />)}
        <div style={{ color: T.sub, fontSize: 11.5, fontWeight: 600, padding: '20px 2px 6px' }}>已停用</div>
        {ACC_INACTIVE.map(a => <AccRow key={a.id} a={a} onClick={() => onRow(a)} />)}
        <div style={{ color: T.faint, fontSize: 10.5, padding: '10px 2px' }}>市值為該帳戶持股小計（原幣別）。長按可拖曳排序。</div>
      </div>
      <AccFab onClick={onAdd} />
    </div>
  );
}

/* inline 現金編輯卡（定稿 B：檢視 ⇄ 編輯態） */
function CashCardLive({ a, onToast }) {
  const { accent } = useAA();
  const isUS = a.mkt === 'US';
  const [editing, setEditing] = vaS(false);
  const [tw, setTw] = vaS(String(a.cashTW));
  const [us, setUs] = vaS(String(a.cashUS));
  const [saved, setSaved] = vaS({ tw: a.cashTW, us: a.cashUS });

  if (!editing) {
    return (
      <Card style={{ marginTop: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ color: T.ink, fontWeight: 700, fontSize: 13.5 }}>現金餘額</span>
          <span onClick={() => { setTw(String(saved.tw)); setUs(String(saved.us)); setEditing(true); }} style={{ color: accent, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>編輯</span>
        </div>
        <AccKv k="TWD 現金" v={`NT$ ${nf(saved.tw)}`} />
        <AccKv k="USD 現金" v={`US$ ${nf(saved.us, 2)}`} last />
        <div style={{ color: T.faint, fontSize: 10, marginTop: 8 }}>手動快照 · 更新於 2026/06/10 21:14</div>
      </Card>
    );
  }

  const save = () => {
    setSaved({ tw: parseFloat(tw) || 0, us: parseFloat(us) || 0 });
    setEditing(false);
    onToast && onToast('現金餘額已更新（demo）');
  };
  const CashInput = ({ value, onChange, unit, focus }) => (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 10, minWidth: 150, justifyContent: 'flex-end',
      background: 'rgba(255,255,255,0.05)', border: `1px solid ${focus ? accent + '88' : 'rgba(255,255,255,0.12)'}`,
    }}>
      <input className="num" autoFocus={focus} value={value} inputMode="decimal"
        onChange={e => onChange(e.target.value.replace(/[^0-9.]/g, ''))}
        style={{ background: 'transparent', border: 'none', outline: 'none', color: T.ink, fontSize: 15, fontWeight: 700, width: 104, textAlign: 'right', padding: 0 }} />
      <span style={{ color: T.sub, fontSize: 11 }}>{unit}</span>
    </span>
  );
  return (
    <Card glowAccent style={{ marginTop: 14, borderColor: accent + '55' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ color: T.ink, fontWeight: 700, fontSize: 13.5 }}>現金餘額</span>
        <span style={{ display: 'inline-flex', gap: 14 }}>
          <span onClick={() => setEditing(false)} style={{ color: T.sub, fontSize: 12.5, cursor: 'pointer' }}>取消</span>
          <span onClick={save} style={{ color: accent, fontSize: 12.5, fontWeight: 800, cursor: 'pointer' }}>儲存</span>
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '6px 0' }}>
        <span style={{ color: T.sub, fontSize: 13 }}>TWD 現金</span>
        <CashInput value={tw} onChange={setTw} unit="NT$" focus={!isUS} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '6px 0' }}>
        <span style={{ color: T.sub, fontSize: 13 }}>USD 現金</span>
        <CashInput value={us} onChange={setUs} unit="US$" focus={isUS} />
      </div>
      <div style={{ color: T.faint, fontSize: 10, marginTop: 8 }}>直接點數字即可修改 · 儲存後記錄更新時間</div>
    </Card>
  );
}

/* 帳戶詳情（push，光暈 = 帳戶識別色） */
function AccountDetailScreen({ a, onClose, onToast, onConfirm }) {
  const { accent, acctTint } = useAA();
  const tint = acctTint === false ? accent : a.color;
  const isUS = a.mkt === 'US';
  const cash = isUS ? a.cashUS : a.cashTW;
  const cy = isUS ? 'US$' : 'NT$';
  const hasTxns = a.active; // demo：使用中帳戶視為有交易紀錄
  return (
    <div className="aa-push" style={{ background: `radial-gradient(420px 260px at 50% -6%, color-mix(in srgb, ${tint} 17%, transparent), transparent 70%), #0E1117` }}>
      <StatusBar />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 14px 10px', flex: '0 0 auto' }}>
        <IconBtn id="back" label="返回" onClick={onClose} />
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ color: T.ink, fontWeight: 700, fontSize: 15 }}>{a.name}</div>
          <div style={{ color: T.sub, fontSize: 11 }}>{a.typeLabel} · 基礎幣別 {a.base}</div>
        </div>
        <IconBtn id="more" label="更多" />
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 18px' }} className="aa-scroll">
        <div style={{ paddingTop: 2 }}>
          <div style={{ color: T.sub, fontSize: 12.5 }}>帳戶總值（{a.base}）</div>
          <div className="num" style={{ color: T.ink, fontSize: 30, fontWeight: 800, letterSpacing: '-.02em', marginTop: 2 }}>{accFmt(a.val + cash, cy)}</div>
          <div className="num" style={{ color: T.sub, fontSize: 11.5, marginTop: 4 }}>持股 {accFmt(a.val, cy)} · 現金 {accFmt(cash, cy)}</div>
        </div>

        <CashCardLive a={a} onToast={onToast} />

        <Card style={{ marginTop: 12, padding: '10px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '4px 0 2px' }}>
            <span style={{ color: T.ink, fontSize: 13.5, fontWeight: 700 }}>持股</span>
            <span className="num" style={{ color: T.faint, fontSize: 10.5 }}>{a.n} 檔</span>
          </div>
          {a.holds.map(h => (
            <div key={h.sym} className="aa-row" style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 0', borderTop: `1px solid ${T.line}` }}>
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
          {!a.holds.length && <EmptyState icon="holdings" title="此帳戶目前無持股" sub={a.active ? '新增交易後會顯示在這裡' : '帳戶已停用，重新啟用後可新增交易'} pad={22} />}
        </Card>

        <Card style={{ marginTop: 12 }}>
          <div style={{ color: T.ink, fontWeight: 700, fontSize: 13.5, marginBottom: 4 }}>帳戶資訊</div>
          <AccKv k="券商" v={`${a.name}（${a.broker}）`} />
          <AccKv k="帳戶類型" v={a.typeLabel} />
          <AccKv k="基礎幣別" v={a.base} />
          <AccKv k="備註" v={a.notes || '—'} last />
        </Card>

        {a.active ? (
          <button onClick={() => onConfirm({
            title: '停用這個帳戶？', message: '停用後不會出現在列表與統計中，可隨時重新啟用（軟刪除）。', label: '停用',
            action: () => onToast('帳戶已停用（demo）'),
          })} className="aa-ghost" style={{ marginTop: 14 }}>停用帳戶</button>
        ) : (
          <button onClick={() => onConfirm({
            title: '重新啟用帳戶？', message: '啟用後會重新出現在列表與統計中。', label: '啟用',
            action: () => onToast('帳戶已重新啟用（demo）'),
          })} className="aa-ghost" style={{ marginTop: 14, borderColor: accent + '66', color: accent }}>重新啟用帳戶</button>
        )}
        <button onClick={() => hasTxns
          ? onConfirm({ title: '無法刪除帳戶', message: '此帳戶仍有交易紀錄。請先轉移或刪除其交易，或改用「停用」。' })
          : onConfirm({ title: '刪除這個帳戶？', message: '刪除後無法復原。', label: '刪除', danger: true, action: () => onToast('帳戶已刪除（demo）') })
        } className="aa-ghost" style={{ marginTop: 9, borderColor: T.down + '55', color: T.down }}>刪除帳戶</button>
        <div style={{ color: T.faint, fontSize: 10.5, textAlign: 'center', marginTop: 8 }}>刪除前需先處理該帳戶的交易紀錄；停用為軟刪除（可復原）</div>
      </div>
    </div>
  );
}

/* 新增 / 編輯帳戶（bottom sheet，互動） */
function AccountFormSheetLive({ onClose, onSaved }) {
  const { accent } = useAA();
  const [name, setName] = vaS('');
  const [base, setBase] = vaS('TWD');
  const [color, setColor] = vaS('#4C6FE8');
  const swatches = ['#4C6FE8', '#7C6CF0', '#A368F0', '#22C55E', '#E8B14C', '#FF7A45'];
  return (
    <div className="aa-scrim" onClick={onClose}>
      <div className="aa-sheet" onClick={e => e.stopPropagation()}>
        <div className="aa-handle"></div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 2px 14px' }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.sub, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>取消</button>
          <span style={{ color: T.ink, fontWeight: 700, fontSize: 15 }}>新增帳戶</span>
          <button onClick={onSaved} style={{ background: 'none', border: 'none', color: accent, fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>儲存</button>
        </div>

        <div style={{ marginBottom: 11 }}>
          <div style={{ color: T.sub, fontSize: 11.5, marginBottom: 6 }}>帳戶名稱</div>
          <div className="aa-field">
            <input className="aa-input" placeholder="例：我的群益帳戶" value={name} onChange={e => setName(e.target.value)} />
          </div>
        </div>
        <div style={{ marginBottom: 11 }}>
          <div style={{ color: T.sub, fontSize: 11.5, marginBottom: 6 }}>券商</div>
          <div className="aa-field"><span style={{ color: T.ink, fontSize: 14, fontWeight: 600 }}>群益證券</span><Icon id="chev" color={T.faint} size={16} /></div>
        </div>
        <div style={{ marginBottom: 11 }}>
          <div style={{ color: T.sub, fontSize: 11.5, marginBottom: 6 }}>帳戶類型</div>
          <div className="aa-field"><span style={{ color: T.ink, fontSize: 14, fontWeight: 600 }}>證券戶</span><Icon id="chev" color={T.faint} size={16} /></div>
        </div>
        <div style={{ marginBottom: 11 }}>
          <div style={{ color: T.sub, fontSize: 11.5, marginBottom: 6 }}>基礎幣別</div>
          <Segmented options={['TWD', 'USD']} value={base} onChange={setBase} />
        </div>
        <div style={{ marginBottom: 11 }}>
          <div style={{ color: T.sub, fontSize: 11.5, marginBottom: 8 }}>識別色（列表圓標與詳情頁光暈）</div>
          <div style={{ display: 'flex', gap: 10 }}>
            {swatches.map(c => {
              const on = c === color;
              return <span key={c} onClick={() => setColor(c)} style={{
                width: 26, height: 26, borderRadius: '50%', background: c, cursor: 'pointer', flex: '0 0 auto',
                boxShadow: on ? `0 0 0 2px #0F1218, 0 0 0 4px ${c}` : 'none', transition: 'box-shadow .15s',
              }}></span>;
            })}
          </div>
        </div>
        <div style={{ marginBottom: 11 }}>
          <div style={{ color: T.sub, fontSize: 11.5, marginBottom: 6 }}>備註（選填）</div>
          <div className="aa-field"><input className="aa-input" placeholder="例：長期持有為主" /></div>
        </div>
        <div style={{ height: 6 }}></div>
      </div>
    </div>
  );
}

Object.assign(window, { AccountListScreen, AccountDetailScreen, AccountFormSheetLive, CashCardLive });
