/* auth-shared.jsx — Auth 探索共用：tokens / logo 標誌 / 表單小件 / 手機殼
   沿用 app-prototype 視覺系統（aa-core T tokens 的子集） */

const AT = {
  bg:    '#0E1117',
  ink:   'rgba(255,255,255,0.95)',
  ink2:  'rgba(255,255,255,0.62)',
  sub:   'rgba(255,255,255,0.42)',
  faint: 'rgba(255,255,255,0.26)',
  line:  'rgba(255,255,255,0.09)',
  line2: 'rgba(255,255,255,0.14)',
  accent:'#7C6CF0',
  accent2:'#4C6FE8',
};

/* ============================ Logo 標誌（3 款） ============================ */
function MarkGrad({ id }) {
  return (
    <defs>
      {/* userSpaceOnUse：避免純垂直/水平線段因零面積 bounding box 導致漸層 stroke 不渲染 */}
      <linearGradient id={id} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="48" y2="48">
        <stop offset="0%" stopColor={AT.accent} />
        <stop offset="100%" stopColor={AT.accent2} />
      </linearGradient>
    </defs>
  );
}

let markSeq = 0;
/* 款 1「A 即是錨」— 字母 A 的兩腿外捲成錨爪、橫槓即錨桿、頂上錨環 */
function MarkA({ size = 64 }) {
  const id = React.useRef('mkA' + (++markSeq)).current;
  const s = { fill: 'none', stroke: `url(#${id})`, strokeWidth: 3.6, strokeLinecap: 'round', strokeLinejoin: 'round' };
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} style={{ display: 'block' }}>
      <MarkGrad id={id} />
      <circle cx="24" cy="9" r="3.6" {...s} />
      <path d="M22.6 12.4 L11.5 38.5 C10.6 40.6 8.8 41.6 6.8 41" {...s} />
      <path d="M25.4 12.4 L36.5 38.5 C37.4 40.6 39.2 41.6 41.2 41" {...s} />
      <path d="M16.4 29.5 H31.6" {...s} />
    </svg>
  );
}

/* 款 2「圓環錨點」— 經典錨形：環 + 桿 + 弧爪，幾何乾淨 */
function MarkB({ size = 64 }) {
  const id = React.useRef('mkB' + (++markSeq)).current;
  const s = { fill: 'none', stroke: `url(#${id})`, strokeWidth: 3.6, strokeLinecap: 'round', strokeLinejoin: 'round' };
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} style={{ display: 'block' }}>
      <MarkGrad id={id} />
      <circle cx="24" cy="11" r="5.2" {...s} />
      <path d="M24 16.2 V41" {...s} />
      <path d="M14.5 25.5 H33.5" {...s} />
      <path d="M9 31 C10 38.4 16 42.4 24 42.4 C32 42.4 38 38.4 39 31" {...s} />
      <path d="M9 31 L6.2 36.2 M9 31 L14.4 33.2" {...s} strokeWidth="3" />
      <path d="M39 31 L41.8 36.2 M39 31 L33.6 33.2" {...s} strokeWidth="3" />
    </svg>
  );
}

/* 款 3「錨定上升」— 走勢線自錨點環出發向上，資產被「錨住」後成長 */
function MarkC({ size = 64 }) {
  const id = React.useRef('mkC' + (++markSeq)).current;
  const s = { fill: 'none', stroke: `url(#${id})`, strokeWidth: 3.6, strokeLinecap: 'round', strokeLinejoin: 'round' };
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} style={{ display: 'block' }}>
      <MarkGrad id={id} />
      <circle cx="11" cy="36" r="5" {...s} />
      <path d="M11 41 V44.5" {...s} />
      <path d="M15.2 32.5 L24 22.5 L30 27.5 L40.5 12.5" {...s} />
      <path d="M40.5 21 V12.5 H32.5" {...s} />
    </svg>
  );
}

const MARKS = { A: MarkA, B: MarkB, C: MarkC };
function LogoMark({ variant = 'B', size = 64, glow = true }) {
  const M = MARKS[variant] || MarkB;
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: '0 0 auto' }}>
      {glow && <div style={{ position: 'absolute', inset: '-30%', borderRadius: '50%', background: `radial-gradient(circle, ${AT.accent}38, transparent 68%)`, filter: 'blur(6px)' }}></div>}
      <div style={{ position: 'relative' }}><M size={size} /></div>
    </div>
  );
}

function Wordmark({ size = 26 }) {
  return (
    <div className="num" style={{ fontSize: size, fontWeight: 800, letterSpacing: '-0.01em', lineHeight: 1, whiteSpace: 'nowrap' }}>
      <span style={{ color: AT.ink }}>Asset</span>
      <span style={{ background: `linear-gradient(120deg, ${AT.accent}, ${AT.accent2})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>Anchor</span>
    </div>
  );
}

/* ============================ 小 icons ============================ */
function AIcon({ id, color = AT.faint, size = 18 }) {
  const s = { fill: 'none', stroke: color, strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const P = {
    mail: <><rect x="2.5" y="4.5" width="16" height="12" rx="2.4" {...s} /><path d="M3.5 6.5 L10.5 11.5 L17.5 6.5" {...s} /></>,
    lock: <><rect x="4" y="9" width="13" height="9" rx="2.2" {...s} /><path d="M7 9 V7 a3.5 3.5 0 017 0 V9" {...s} /></>,
    eye:  <><path d="M2.5 10.5 C4.5 6.8 7.3 5 10.5 5 C13.7 5 16.5 6.8 18.5 10.5 C16.5 14.2 13.7 16 10.5 16 C7.3 16 4.5 14.2 2.5 10.5 Z" {...s} /><circle cx="10.5" cy="10.5" r="2.6" {...s} /></>,
    back: <path d="M13 5 l-6 6 6 6" {...s} strokeWidth="2" />,
  };
  return <svg viewBox="0 0 21 21" width={size} height={size} style={{ flex: '0 0 auto' }}>{P[id]}</svg>;
}

function GoogleG({ size = 18 }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} style={{ flex: '0 0 auto' }}>
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"/>
    </svg>
  );
}

/* ============================ 表單小件（靜態展示） ============================ */
function AField({ icon, placeholder, value, secure, label, error, style }) {
  return (
    <div style={style}>
      {label && <div style={{ fontSize: 12, fontWeight: 700, color: AT.sub, marginBottom: 7, letterSpacing: '.02em' }}>{label}</div>}
      <div className="aa-field" style={{ gap: 10, borderColor: error ? '#FF5E6266' : undefined }}>
        {icon && <AIcon id={icon} />}
        {value
          ? <span style={{ fontSize: 14, fontWeight: 700, color: AT.ink, flex: 1 }}>{secure ? '••••••••' : value}</span>
          : <span style={{ fontSize: 14, fontWeight: 600, color: AT.faint, flex: 1 }}>{placeholder}</span>}
        {secure && <AIcon id="eye" />}
      </div>
      {error && <div style={{ fontSize: 12, fontWeight: 600, color: '#FF5E62', marginTop: 6 }}>{error}</div>}
    </div>
  );
}

function APrimary({ children, style }) {
  return (
    <button style={{
      width: '100%', padding: '15px 0', border: 'none', borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit',
      background: `linear-gradient(160deg, ${AT.accent}, ${AT.accent}cc)`, color: '#fff', fontSize: 15, fontWeight: 800,
      letterSpacing: '.06em', boxShadow: `0 10px 26px -10px ${AT.accent}`, ...style,
    }}>{children}</button>
  );
}

function AGoogle({ children = '使用 Google 繼續', style }) {
  return (
    <button className="aa-ghost" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '14px 0', whiteSpace: 'nowrap', ...style }}>
      <GoogleG /><span>{children}</span>
    </button>
  );
}

function ADivider({ label = '或' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ flex: 1, height: 1, background: AT.line }}></div>
      <span style={{ fontSize: 12, fontWeight: 600, color: AT.faint }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: AT.line }}></div>
    </div>
  );
}

function ALink({ children, dim }) {
  return <span style={{ fontSize: 13, fontWeight: 700, color: dim ? AT.sub : AT.accent, cursor: 'pointer' }}>{children}</span>;
}

/* ============================ 手機殼 ============================ */
function StatusLite() {
  return (
    <div className="num" style={{ height: 30, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 22px', color: '#fff', fontSize: 13, fontWeight: 700, flex: '0 0 auto' }}>
      <span>9:41</span>
      <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', opacity: .9 }}>
        <span style={{ letterSpacing: 1 }}>▮▮▮</span><span>⌃</span><span style={{ fontSize: 11 }}>100%▮</span>
      </span>
    </div>
  );
}

function Phone({ children, glowTop = true }) {
  return (
    <div style={{
      width: 390, height: 822, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column',
      borderRadius: 42,
      background: glowTop
        ? `radial-gradient(420px 280px at 50% -6%, ${AT.accent}29, transparent 70%), ${AT.bg}`
        : AT.bg,
      border: '1px solid rgba(255,255,255,0.10)',
      boxShadow: '0 40px 90px -40px rgba(0,0,0,0.9), 0 1px 0 rgba(255,255,255,0.07) inset',
    }}>
      <StatusLite />
      {children}
    </div>
  );
}

Object.assign(window, { AT, MarkA, MarkB, MarkC, LogoMark, Wordmark, AIcon, GoogleG, AField, APrimary, AGoogle, ADivider, ALink, Phone, StatusLite });
