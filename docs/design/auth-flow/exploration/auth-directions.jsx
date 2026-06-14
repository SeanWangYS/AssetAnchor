/* auth-directions.jsx — SignIn 三個視覺方向（390×822 手機框內，靜態高保真） */

/* ============ 方向 A「錨定置中」— 經典置中、品牌光暈主視覺 ============ */
function DirA() {
  return (
    <Phone>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 28px 34px' }}>
        <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, paddingTop: 74 }}>
          <LogoMark variant="B" size={78} />
          <Wordmark size={30} />
          <div style={{ fontSize: 13.5, fontWeight: 500, color: AT.sub, marginTop: -6 }}>你的資產，一處錨定</div>
        </div>
        <div style={{ flex: 1 }}></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <AField icon="mail" placeholder="電子郵件" />
          <AField icon="lock" placeholder="密碼" secure />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -4 }}><ALink dim>忘記密碼？</ALink></div>
          <APrimary style={{ marginTop: 6 }}>登 入</APrimary>
          <ADivider />
          <AGoogle>使用 Google 登入</AGoogle>
        </div>
        <div style={{ flex: 1 }}></div>
        <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 600, color: AT.sub }}>
          還沒有帳號？ <ALink>建立帳號</ALink>
        </div>
      </div>
    </Phone>
  );
}

/* ============ 方向 B「資產氛圍」— 上半走勢光暈品牌區 + 浮卡表單 ============ */
function AmbientChart() {
  const id = 'ambA';
  return (
    <svg viewBox="0 0 390 240" width="390" height="240" preserveAspectRatio="none" style={{ position: 'absolute', left: 0, bottom: 0, display: 'block' }}>
      <defs>
        <linearGradient id={id + 'f'} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={AT.accent} stopOpacity="0.22" />
          <stop offset="100%" stopColor={AT.accent} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={id + 'l'} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={AT.accent} stopOpacity="0" />
          <stop offset="35%" stopColor={AT.accent} stopOpacity="0.55" />
          <stop offset="100%" stopColor={AT.accent2} stopOpacity="0.95" />
        </linearGradient>
        <filter id={id + 'g'} x="-20%" y="-40%" width="140%" height="180%">
          <feGaussianBlur stdDeviation="3.2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <path d="M0 198 C50 192 78 168 120 158 C162 148 186 122 232 108 C278 94 318 64 390 38 L390 240 L0 240 Z" fill={`url(#${id}f)`} />
      <path d="M0 198 C50 192 78 168 120 158 C162 148 186 122 232 108 C278 94 318 64 390 38" fill="none" stroke={`url(#${id}l)`} strokeWidth="2.4" strokeLinecap="round" filter={`url(#${id}g)`} />
    </svg>
  );
}

function DirB() {
  return (
    <Phone>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 22px 30px' }}>
        {/* 品牌區 */}
        <div style={{ position: 'relative', height: 250, flex: '0 0 auto', margin: '0 -22px' }}>
          <AmbientChart />
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 14, padding: '46px 30px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
              <LogoMark variant="B" size={46} />
              <Wordmark size={25} />
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: AT.ink, lineHeight: 1.35, marginTop: 14 }}>
              歡迎回來
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 500, color: AT.ink2, marginTop: -8 }}>登入後接續追蹤你的投資組合</div>
          </div>
        </div>
        {/* 表單卡 */}
        <div style={{
          position: 'relative', borderRadius: 20, padding: '22px 18px',
          background: 'linear-gradient(160deg, rgba(255,255,255,0.055), rgba(255,255,255,0.022))',
          border: `1px solid ${AT.line2}`,
          boxShadow: '0 18px 44px -20px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.06)',
          display: 'flex', flexDirection: 'column', gap: 14, marginTop: 4,
        }}>
          <AField label="電子郵件" placeholder="you@example.com" />
          <AField label="密碼" placeholder="至少 6 個字元" secure />
          <APrimary style={{ marginTop: 4 }}>登 入</APrimary>
          <ADivider />
          <AGoogle>使用 Google 登入</AGoogle>
        </div>
        <div style={{ textAlign: 'center', marginTop: 18 }}><ALink dim>忘記密碼？</ALink></div>
        <div style={{ flex: 1 }}></div>
        <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 600, color: AT.sub }}>
          還沒有帳號？ <ALink>建立帳號</ALink>
        </div>
      </div>
    </Phone>
  );
}

/* ============ 方向 C「編輯式極簡」— 左對齊大標、輕量品牌、底部行動區 ============ */
function DirC() {
  return (
    <Phone glowTop={false}>
      {/* 左上角斜向光暈，呼應但更收斂 */}
      <div style={{ position: 'absolute', top: -120, left: -80, width: 360, height: 320, borderRadius: '50%', background: `radial-gradient(circle, ${AT.accent}1f, transparent 65%)`, pointerEvents: 'none' }}></div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 28px 34px', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 26 }}>
          <LogoMark variant="B" size={30} glow={false} />
          <span className="num" style={{ fontSize: 15, fontWeight: 800, color: AT.ink2, letterSpacing: '.01em' }}>AssetAnchor</span>
        </div>
        <div style={{ paddingTop: 64 }}>
          <div style={{ fontSize: 36, fontWeight: 800, color: AT.ink, lineHeight: 1.22, letterSpacing: '.01em' }}>歡迎回來</div>
          <div style={{ fontSize: 14.5, fontWeight: 500, color: AT.sub, marginTop: 12, lineHeight: 1.6 }}>登入以繼續管理你的持倉、<br />交易與資產配置。</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 44 }}>
          <AField label="電子郵件" placeholder="you@example.com" />
          <div>
            <AField label="密碼" placeholder="輸入密碼" secure />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}><ALink dim>忘記密碼？</ALink></div>
          </div>
        </div>
        <div style={{ flex: 1 }}></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
          <APrimary>登 入</APrimary>
          <AGoogle>使用 Google 登入</AGoogle>
          <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 600, color: AT.sub, marginTop: 10 }}>
            還沒有帳號？ <ALink>建立帳號</ALink>
          </div>
        </div>
      </div>
    </Phone>
  );
}

/* ============ Logo 提案列 ============ */
function LogoCard({ variant, title, desc }) {
  const M = { A: MarkA, B: MarkB, C: MarkC }[variant];
  return (
    <div style={{ width: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, padding: '38px 24px 30px', background: '#0E1117', borderRadius: 24, border: '1px solid rgba(255,255,255,0.10)' }}>
      <LogoMark variant={variant} size={84} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <M size={26} />
        <Wordmark size={22} />
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: AT.ink }}>{title}</div>
        <div style={{ fontSize: 12.5, fontWeight: 500, color: AT.sub, marginTop: 6, lineHeight: 1.6 }}>{desc}</div>
      </div>
    </div>
  );
}

Object.assign(window, { DirA, DirB, DirC, LogoCard });
