/* aa-auth.jsx — AssetAnchor Auth 流程（Sprint 1 / planning §11 AuthStack）
   方向 A「錨定置中」＋ 款 2「圓環錨點」標誌。Email+密碼（Firebase Auth）。
   依賴 aa-core.jsx（T, useAA, Icon, StatusBar）。匯出至 window。

   ── Demo 觸發（純前端模擬，無真後端）──
   · 登入：email 含 "wrong" → 顯示「電子郵件或密碼錯誤」；其餘 → 成功
   · 註冊：email 含 "taken" → 顯示「此電子郵件已被註冊」；其餘 → 成功
   · 任何成功操作有 ~1.1s 按鈕 loading（模擬網路）
*/

const { useState: aS, useRef: aR, useEffect: aE } = React;

/* ============================ 標誌：款 2 圓環錨點 ============================ */
let aaMkSeq = 0;
function AAMark({ size = 64 }) {
  const { accent } = useAA();
  const id = aR('aamk' + (++aaMkSeq)).current;
  const s = { fill: 'none', stroke: `url(#${id})`, strokeWidth: 3.6, strokeLinecap: 'round', strokeLinejoin: 'round' };
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} style={{ display: 'block' }}>
      <defs>
        {/* userSpaceOnUse：純垂直/水平線段才吃得到漸層 */}
        <linearGradient id={id} gradientUnits="userSpaceOnUse" x1="6" y1="6" x2="42" y2="44">
          <stop offset="0%" stopColor={accent} stopOpacity="0.82" />
          <stop offset="100%" stopColor={accent} />
        </linearGradient>
      </defs>
      <circle cx="24" cy="11" r="5.2" {...s} />
      <path d="M24 16.2 V41" {...s} />
      <path d="M14.5 25.5 H33.5" {...s} />
      <path d="M9 31 C10 38.4 16 42.4 24 42.4 C32 42.4 38 38.4 39 31" {...s} />
      <path d="M9 31 L6.2 36.2 M9 31 L14.4 33.2" {...s} strokeWidth="3" />
      <path d="M39 31 L41.8 36.2 M39 31 L33.6 33.2" {...s} strokeWidth="3" />
    </svg>
  );
}

function AALogoMark({ size = 64, glow = true }) {
  const { accent, glow: ctxGlow } = useAA();
  const showGlow = glow && ctxGlow;
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: '0 0 auto', display: 'grid', placeItems: 'center' }}>
      {showGlow && <div style={{ position: 'absolute', inset: '-32%', borderRadius: '50%', background: `radial-gradient(circle, ${accent}3a, transparent 68%)`, filter: 'blur(7px)' }}></div>}
      <div style={{ position: 'relative' }}><AAMark size={size} /></div>
    </div>
  );
}

function AAWordmark({ size = 28 }) {
  const { accent } = useAA();
  return (
    <div className="num" style={{ fontSize: size, fontWeight: 800, letterSpacing: '-0.01em', lineHeight: 1, whiteSpace: 'nowrap' }}>
      <span style={{ color: T.ink }}>Asset</span>
      <span style={{ color: accent }}>Anchor</span>
    </div>
  );
}

/* 標誌＋字標橫向鎖定（設定頁 / 關於頁共用） */
function AABrandLockup({ markSize = 30, wordSize = 17, glow = false }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <AALogoMark size={markSize} glow={glow} />
      <AAWordmark size={wordSize} />
    </div>
  );
}

/* ============================ icons ============================ */
function AuIcon({ id, color, size = 18 }) {
  const s = { fill: 'none', stroke: color, strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const P = {
    mail:  <><rect x="2.5" y="4.5" width="16" height="12" rx="2.4" {...s} /><path d="M3.5 6.5 L10.5 11.5 L17.5 6.5" {...s} /></>,
    lock:  <><rect x="4" y="9" width="13" height="9" rx="2.2" {...s} /><path d="M7 9 V7 a3.5 3.5 0 017 0 V9" {...s} /></>,
    eye:   <><path d="M2.5 10.5 C4.5 6.8 7.3 5 10.5 5 C13.7 5 16.5 6.8 18.5 10.5 C16.5 14.2 13.7 16 10.5 16 C7.3 16 4.5 14.2 2.5 10.5 Z" {...s} /><circle cx="10.5" cy="10.5" r="2.6" {...s} /></>,
    eyeoff:<><path d="M3 3 L18 18" {...s} /><path d="M7.5 5.8 C8.4 5.3 9.4 5 10.5 5 C13.7 5 16.5 6.8 18.5 10.5 C17.9 11.6 17.2 12.5 16.4 13.2 M13.5 13.9 C12.6 14.6 11.6 15 10.5 16 C7.3 16 4.5 14.2 2.5 10.5 C3.3 9 4.3 7.9 5.4 7.1" {...s} /></>,
    alert: <><circle cx="10.5" cy="10.5" r="7.5" {...s} /><path d="M10.5 7 V11" {...s} /><circle cx="10.5" cy="13.8" r="0.4" fill={color} stroke={color} strokeWidth="1" /></>,
    check: <path d="M5 11 l3.5 3.5 L16 6" {...s} strokeWidth="2" />,
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

/* ============================ 表單小件 ============================ */
function AuField({ icon, label, type = 'text', value, onChange, placeholder, error, secure, onSubmit, autoFocus }) {
  const { accent } = useAA();
  const [show, setShow] = aS(false);
  const [focus, setFocus] = aS(false);
  const ref = aR(null);
  aE(() => { if (autoFocus && ref.current) ref.current.focus(); }, []);
  const borderColor = error ? '#FF5E6277' : focus ? `${accent}99` : T.line2;
  return (
    <div>
      {label && <div style={{ fontSize: 12, fontWeight: 700, color: T.sub, marginBottom: 7, letterSpacing: '.02em' }}>{label}</div>}
      <div className="aa-field" style={{ gap: 10, borderColor, boxShadow: focus ? `0 0 0 3px ${accent}1f` : 'none', transition: 'border-color .15s, box-shadow .15s' }}>
        {icon && <AuIcon id={icon} color={error ? '#FF8A8E' : (focus ? accent : T.faint)} />}
        <input
          ref={ref}
          className="aa-input"
          type={secure && !show ? 'password' : (type === 'email' ? 'email' : 'text')}
          inputMode={type === 'email' ? 'email' : undefined}
          autoCapitalize="none" autoCorrect="off" spellCheck="false"
          value={value}
          placeholder={placeholder}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          onKeyDown={e => { if (e.key === 'Enter' && onSubmit) onSubmit(); }}
          style={{ fontWeight: 700 }}
        />
        {secure && (
          <button type="button" onClick={() => setShow(s => !s)} aria-label={show ? '隱藏密碼' : '顯示密碼'}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'grid', placeItems: 'center' }}>
            <AuIcon id={show ? 'eyeoff' : 'eye'} color={T.sub} />
          </button>
        )}
      </div>
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6 }}>
          <AuIcon id="alert" color="#FF8A8E" size={13} />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#FF8A8E' }}>{error}</span>
        </div>
      )}
    </div>
  );
}

function AuPrimary({ children, onClick, loading, disabled, style }) {
  const { accent } = useAA();
  const off = disabled || loading;
  return (
    <button onClick={off ? undefined : onClick} disabled={off} style={{
      width: '100%', padding: '15px 0', border: 'none', borderRadius: 14, cursor: off ? 'default' : 'pointer', fontFamily: 'inherit',
      background: `linear-gradient(160deg, ${accent}, ${accent}cc)`, color: '#fff', fontSize: 15, fontWeight: 800, letterSpacing: '.06em',
      boxShadow: off ? 'none' : `0 12px 28px -12px ${accent}`, opacity: off ? 0.62 : 1, transition: 'opacity .15s, box-shadow .15s',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 50, whiteSpace: 'nowrap', ...style,
    }}>
      {loading ? <span className="aa-spin"></span> : children}
    </button>
  );
}

function AuGoogle({ children = '使用 Google 繼續', onClick }) {
  return (
    <button onClick={onClick} className="aa-ghost" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '14px 0', whiteSpace: 'nowrap' }}>
      <GoogleG /><span>{children}</span>
    </button>
  );
}

function AuDivider({ label = '或' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ flex: 1, height: 1, background: T.line }}></div>
      <span style={{ fontSize: 12, fontWeight: 600, color: T.faint }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: T.line }}></div>
    </div>
  );
}

/* 表單層級錯誤橫幅（auth 錯誤） */
function AuBanner({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '11px 13px', borderRadius: 12, background: 'rgba(255,94,98,0.12)', border: '1px solid rgba(255,94,98,0.32)' }}>
      <div style={{ marginTop: 1 }}><AuIcon id="alert" color="#FF8A8E" size={16} /></div>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: '#FFAEB0', lineHeight: 1.5 }}>{children}</span>
    </div>
  );
}

/* ============================ 驗證 ============================ */
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const valEmail = (v) => !v.trim() ? '請輸入電子郵件' : (!emailRe.test(v.trim()) ? '電子郵件格式不正確' : '');
const valPw = (v) => !v ? '請輸入密碼' : (v.length < 6 ? '密碼至少 6 個字元' : '');

/* ============================ Splash gate ============================ */
function SplashGate() {
  const { accent } = useAA();
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 22,
      background: `radial-gradient(460px 320px at 50% 38%, ${accent}26, transparent 70%), #0E1117`,
      animation: 'aaFade .3s ease',
    }}>
      <div style={{ animation: 'aaSplashIn .6s cubic-bezier(.2,.8,.25,1) both' }}>
        <AALogoMark size={92} />
      </div>
      <div style={{ animation: 'aaSplashIn .6s .08s cubic-bezier(.2,.8,.25,1) both' }}>
        <AAWordmark size={30} />
      </div>
      <div style={{ position: 'absolute', bottom: 64, display: 'flex', gap: 7 }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: accent, opacity: 0.5, animation: `aaDot 1s ${i * 0.16}s infinite ease-in-out` }}></span>
        ))}
      </div>
    </div>
  );
}

/* ============================ SignIn（方向 A · 錨定置中） ============================ */
function SignInScreen({ onAuthed, onSignUp, onForgot, onSkip }) {
  const { accent } = useAA();
  const [email, setEmail] = aS('');
  const [pw, setPw] = aS('');
  const [err, setErr] = aS({});
  const [authErr, setAuthErr] = aS('');
  const [loading, setLoading] = aS('');

  const submit = () => {
    const e = { email: valEmail(email), pw: valPw(pw) };
    setErr(e); setAuthErr('');
    if (e.email || e.pw) return;
    setLoading('email');
    setTimeout(() => {
      setLoading('');
      if (/wrong/i.test(email)) { setAuthErr('電子郵件或密碼錯誤，請再試一次'); return; }
      onAuthed(email.trim());
    }, 1100);
  };
  const google = () => { setLoading('google'); setTimeout(() => { setLoading(''); onAuthed('sean@gmail.com'); }, 1100); };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 28px 26px', overflowY: 'auto' }} className="aa-scroll">
      {/* 品牌區 */}
      <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, paddingTop: 58 }}>
        <AALogoMark size={76} />
        <AAWordmark size={30} />
        <div style={{ fontSize: 13.5, fontWeight: 500, color: T.sub, marginTop: -4 }}>你的資產，一處錨定</div>
      </div>

      <div style={{ flex: 1, minHeight: 26 }}></div>

      {/* 表單 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
        {authErr && <AuBanner>{authErr}</AuBanner>}
        <AuField icon="mail" type="email" placeholder="電子郵件" value={email}
          onChange={v => { setEmail(v); if (err.email) setErr(s => ({ ...s, email: '' })); }}
          error={err.email} onSubmit={submit} />
        <AuField icon="lock" placeholder="密碼" secure value={pw}
          onChange={v => { setPw(v); if (err.pw) setErr(s => ({ ...s, pw: '' })); }}
          error={err.pw} onSubmit={submit} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -3 }}>
          <span onClick={onForgot} style={{ fontSize: 13, fontWeight: 700, color: T.sub, cursor: 'pointer' }}>忘記密碼？</span>
        </div>
        <AuPrimary onClick={submit} loading={loading === 'email'} style={{ marginTop: 5 }}>登 入</AuPrimary>
        <div style={{ margin: '4px 0' }}><AuDivider /></div>
        <AuGoogle onClick={google} children={loading === 'google' ? '連線中…' : '使用 Google 登入'} />
      </div>

      <div style={{ flex: 1, minHeight: 22 }}></div>

      <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 600, color: T.sub }}>
        還沒有帳號？ <span onClick={onSignUp} style={{ color: accent, fontWeight: 700, cursor: 'pointer' }}>建立帳號</span>
      </div>
      <button onClick={onSkip} style={{ marginTop: 16, alignSelf: 'center', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', color: T.faint, fontSize: 12, fontWeight: 600, padding: 4, whiteSpace: 'nowrap' }}>
        略過登入，直接看 Demo →
      </button>
    </div>
  );
}

/* ============================ 共用 push 標頭 ============================ */
function AuPushHeader({ title, onClose }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 14px 6px', flex: '0 0 auto' }}>
      <IconBtn id="back" label="返回" onClick={onClose} />
      <div style={{ flex: 1, textAlign: 'center', color: T.ink, fontWeight: 700, fontSize: 15, marginRight: 38 }}>{title}</div>
    </div>
  );
}

/* ============================ SignUp（push） ============================ */
function SignUpScreen({ onClose, onAuthed, onSignIn }) {
  const { accent } = useAA();
  const [email, setEmail] = aS('');
  const [pw, setPw] = aS('');
  const [err, setErr] = aS({});
  const [authErr, setAuthErr] = aS('');
  const [loading, setLoading] = aS('');

  const submit = () => {
    const e = { email: valEmail(email), pw: valPw(pw) };
    setErr(e); setAuthErr('');
    if (e.email || e.pw) return;
    setLoading('email');
    setTimeout(() => {
      setLoading('');
      if (/taken/i.test(email)) { setAuthErr('此電子郵件已被註冊，請改用其他信箱或直接登入'); return; }
      onAuthed(email.trim());
    }, 1100);
  };
  const google = () => { setLoading('google'); setTimeout(() => { setLoading(''); onAuthed('sean@gmail.com'); }, 1100); };

  return (
    <div className="aa-push" style={{ zIndex: 70 }}>
      <StatusBar />
      <AuPushHeader title="建立帳號" onClose={onClose} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 28px 26px', overflowY: 'auto' }} className="aa-scroll">
        <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, paddingTop: 24 }}>
          <AALogoMark size={58} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 21, fontWeight: 800, color: T.ink }}>開始追蹤你的投資</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: T.sub, marginTop: 6 }}>用電子郵件建立 AssetAnchor 帳號</div>
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 22 }}></div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {authErr && <AuBanner>{authErr}</AuBanner>}
          <AuField icon="mail" type="email" label="電子郵件" placeholder="you@example.com" value={email}
            onChange={v => { setEmail(v); if (err.email) setErr(s => ({ ...s, email: '' })); }} error={err.email} onSubmit={submit} autoFocus />
          <AuField icon="lock" label="密碼" placeholder="至少 6 個字元" secure value={pw}
            onChange={v => { setPw(v); if (err.pw) setErr(s => ({ ...s, pw: '' })); }} error={err.pw} onSubmit={submit} />
          <div style={{ fontSize: 11.5, color: T.faint, lineHeight: 1.6, marginTop: -2 }}>
            建立帳號即表示你同意我們的服務條款與隱私權政策。
          </div>
          <AuPrimary onClick={submit} loading={loading === 'email'} style={{ marginTop: 2 }}>建立帳號</AuPrimary>
          <AuDivider />
          <AuGoogle onClick={google} children={loading === 'google' ? '連線中…' : '使用 Google 註冊'} />
        </div>

        <div style={{ flex: 1, minHeight: 18 }}></div>
        <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 600, color: T.sub }}>
          已經有帳號了？ <span onClick={onSignIn} style={{ color: accent, fontWeight: 700, cursor: 'pointer' }}>登入</span>
        </div>
      </div>
    </div>
  );
}

/* ============================ ForgotPassword（push，含寄信成功） ============================ */
function ForgotScreen({ onClose, presetEmail }) {
  const { accent } = useAA();
  const [email, setEmail] = aS(presetEmail || '');
  const [err, setErr] = aS('');
  const [loading, setLoading] = aS(false);
  const [sent, setSent] = aS(false);

  const submit = () => {
    const e = valEmail(email);
    setErr(e);
    if (e) return;
    setLoading(true);
    setTimeout(() => { setLoading(false); setSent(true); }, 1100);
  };

  if (sent) {
    return (
      <div className="aa-push" style={{ zIndex: 72 }}>
        <StatusBar />
        <AuPushHeader title="重設密碼" onClose={onClose} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 32px 40px', textAlign: 'center' }}>
          <div style={{ width: 76, height: 76, borderRadius: '50%', display: 'grid', placeItems: 'center', background: `${accent}1c`, border: `1px solid ${accent}55`, animation: 'aaSplashIn .45s cubic-bezier(.2,.8,.25,1) both' }}>
            <AuIcon id="mail" color={accent} size={34} />
          </div>
          <div style={{ fontSize: 21, fontWeight: 800, color: T.ink, marginTop: 22 }}>信件已寄出</div>
          <div style={{ fontSize: 13.5, fontWeight: 500, color: T.ink2, marginTop: 10, lineHeight: 1.7 }}>
            重設密碼連結已寄到<br /><span className="num" style={{ color: T.ink, fontWeight: 700 }}>{email.trim()}</span><br />請點開信件中的連結設定新密碼。
          </div>
          <div style={{ fontSize: 12, color: T.faint, marginTop: 16, lineHeight: 1.6 }}>沒收到？請檢查垃圾郵件匣，或稍候再試。</div>
          <div style={{ flex: '0 0 auto', width: '100%', marginTop: 30, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <AuPrimary onClick={onClose}>返回登入</AuPrimary>
            <button onClick={() => { setSent(false); }} className="aa-ghost">重新輸入信箱</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="aa-push" style={{ zIndex: 72 }}>
      <StatusBar />
      <AuPushHeader title="重設密碼" onClose={onClose} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 28px 26px' }}>
        <div style={{ paddingTop: 30 }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: T.ink, lineHeight: 1.3 }}>忘記密碼了？</div>
          <div style={{ fontSize: 13.5, fontWeight: 500, color: T.sub, marginTop: 12, lineHeight: 1.7 }}>
            輸入你的註冊信箱，我們會寄一封重設密碼的連結給你。
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 28 }}>
          <AuField icon="mail" type="email" label="電子郵件" placeholder="you@example.com" value={email}
            onChange={v => { setEmail(v); if (err) setErr(''); }} error={err} onSubmit={submit} autoFocus />
          <AuPrimary onClick={submit} loading={loading} style={{ marginTop: 4 }}>寄送重設連結</AuPrimary>
        </div>
        <div style={{ flex: 1 }}></div>
      </div>
    </div>
  );
}

/* ============================ AuthFlow 編排 ============================ */
function AuthFlow({ onAuthed, onSkip }) {
  const [sub, setSub] = aS(null); // null=signin, 'signup', 'forgot'
  const [lastEmail, setLastEmail] = aS('');
  return (
    <React.Fragment>
      <SignInScreen
        onAuthed={onAuthed}
        onSignUp={() => setSub('signup')}
        onForgot={() => setSub('forgot')}
        onSkip={onSkip}
      />
      {sub === 'signup' && <SignUpScreen onClose={() => setSub(null)} onAuthed={onAuthed} onSignIn={() => setSub(null)} />}
      {sub === 'forgot' && <ForgotScreen onClose={() => setSub(null)} presetEmail={lastEmail} />}
    </React.Fragment>
  );
}

Object.assign(window, {
  AAMark, AALogoMark, AAWordmark, AABrandLockup, AuIcon, GoogleG,
  AuField, AuPrimary, AuGoogle, AuDivider, AuBanner,
  SplashGate, SignInScreen, SignUpScreen, ForgotScreen, AuthFlow,
});
