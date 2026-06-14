/* aa-ui-bits.jsx — 共用小件：ConfirmDialog + EmptyState
   依賴 aa-core.jsx（T, useAA, Icon）。匯出至 window。 */

/* 置中確認框：action 省略時為單鈕提示型 */
function ConfirmDialog({ title, message, label = '確認', danger, onAction, onClose }) {
  const { accent } = useAA();
  const col = danger ? T.down : accent;
  return (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)',
      display: 'grid', placeItems: 'center', padding: 32, animation: 'aaFade .18s ease',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 300, borderRadius: 20, padding: '22px 20px 16px',
        background: 'linear-gradient(180deg, #161a22, #10131a)',
        border: '1px solid rgba(255,255,255,0.10)',
        boxShadow: '0 24px 60px -20px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.06)',
        textAlign: 'center',
      }}>
        <div style={{ color: T.ink, fontSize: 16, fontWeight: 800 }}>{title}</div>
        {message && <div style={{ color: T.sub, fontSize: 12.5, lineHeight: 1.65, marginTop: 8 }}>{message}</div>}
        {onAction ? (
          <div style={{ display: 'flex', gap: 9, marginTop: 18 }}>
            <button onClick={onClose} style={{
              flex: 1, padding: '11px 0', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
              background: 'rgba(255,255,255,0.05)', border: `1px solid ${T.line2}`, color: T.ink2, fontSize: 13.5, fontWeight: 600,
            }}>取消</button>
            <button onClick={onAction} style={{
              flex: 1, padding: '11px 0', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', border: 'none',
              background: `linear-gradient(160deg, ${col}, ${col}cc)`, color: '#fff', fontSize: 13.5, fontWeight: 800,
              boxShadow: `0 8px 20px -10px ${col}`,
            }}>{label}</button>
          </div>
        ) : (
          <button onClick={onClose} style={{
            width: '100%', marginTop: 18, padding: '11px 0', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
            background: `linear-gradient(160deg, ${accent}, ${accent}cc)`, border: 'none', color: '#fff', fontSize: 13.5, fontWeight: 800,
            boxShadow: `0 8px 20px -10px ${accent}`,
          }}>我知道了</button>
        )}
      </div>
    </div>
  );
}

/* 空狀態：icon 方塊 + 標題 + 說明（+ 可選動作） */
function EmptyState({ icon = 'txn', title, sub, actionLabel, onAction, pad = 36 }) {
  const { accent } = useAA();
  return (
    <div style={{ display: 'grid', placeItems: 'center', padding: `${pad}px 24px`, textAlign: 'center' }}>
      <div>
        <div style={{
          width: 56, height: 56, margin: '0 auto 14px', borderRadius: 16, display: 'grid', placeItems: 'center',
          background: 'linear-gradient(160deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))', border: `1px solid ${T.line}`,
        }}><Icon id={icon} color={accent} size={26} /></div>
        <div style={{ color: T.ink, fontSize: 14.5, fontWeight: 700 }}>{title}</div>
        {sub && <div style={{ color: T.sub, fontSize: 12, lineHeight: 1.6, marginTop: 6 }}>{sub}</div>}
        {actionLabel && (
          <button onClick={onAction} style={{
            marginTop: 14, padding: '8px 18px', borderRadius: 100, cursor: 'pointer', fontFamily: 'inherit',
            border: `1px solid ${T.line2}`, background: 'transparent', color: T.ink2, fontSize: 12.5, fontWeight: 600,
          }}>{actionLabel}</button>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { ConfirmDialog, EmptyState });
