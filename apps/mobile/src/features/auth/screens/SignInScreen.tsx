import { useLayoutEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AABrandLockup, Button, Icon, Input } from '../../../core/ui';
import { colors, fontFamily, fontSize, radius, spacing } from '../../../core/theme';
import type { AuthStackScreenProps } from '../../../core/navigation/types';
import { useAuthStore } from '../authStore';
import { signInWithEmail, signInWithGoogle } from '../authService';
import GoogleButton from '../components/GoogleButton';
import { emailError, passwordError } from '../validation';

/**
 * SignInScreen —— 方向 A「錨定置中」（auth-flow-spec §1）。
 * 品牌區置中於上、表單沉於下半、註冊入口置底。
 * 行為沿用既有 authStore + authService；本次只重新樣式化並補 spec 狀態
 * （eye 切換 / 錯誤橫幅 / 按鈕 loading / Google ghost / demo 略過登入）。
 */
export default function SignInScreen({ navigation }: AuthStackScreenProps<'SignIn'>) {
  // 全屏品牌版面自帶 layout，隱藏 AuthStack 預設 header（避免雙 header）。
  useLayoutEffect(() => navigation.setOptions({ headerShown: false }), [navigation]);

  const setUser = useAuthStore((s) => s.setUser);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // inline 欄位錯誤（送出時填入；輸入即清除該欄）
  const [emailErr, setEmailErr] = useState<string | null>(null);
  const [pwErr, setPwErr] = useState<string | null>(null);
  // 表單頂部 auth 錯誤橫幅
  const [banner, setBanner] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const anyBusy = busy || googleBusy;

  async function onSignIn() {
    const eErr = emailError(email);
    const pErr = passwordError(password);
    setEmailErr(eErr);
    setPwErr(pErr);
    setBanner(null);
    if (eErr || pErr) return;

    setBusy(true);
    const res = await signInWithEmail(email.trim(), password);
    setBusy(false);
    if (!res.ok) setBanner(res.errorMessage ?? '登入失敗，請再試一次。');
  }

  async function onGoogle() {
    setGoogleBusy(true);
    setBanner(null);
    const res = await signInWithGoogle();
    setGoogleBusy(false);
    if (!res.ok) setBanner(res.errorMessage ?? 'Google 登入失敗，請再試一次。');
  }

  // demo 捷徑：寫入假使用者 → RootNavigator 切到 MainTabs（正式版移除）。
  // 假物件僅滿足導航切換所需，故經 unknown 轉成 FirebaseAuthTypes.User（demo-only）。
  function onSkip() {
    const demoUser = { uid: 'demo', email: 'demo@assetanchor.app' } as unknown;
    setUser(demoUser as Parameters<typeof setUser>[0]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 品牌區（置中於上） */}
          <View style={styles.brand}>
            <AABrandLockup markSize={46} wordSize={25} glow />
            <Text style={styles.tagline}>你的資產，一處錨定</Text>
          </View>

          {/* 表單（沉於下半） */}
          <View style={styles.form}>
            {banner ? (
              <View style={styles.banner}>
                <Icon name="alert" size={18} color={colors.down} />
                <Text style={styles.bannerText}>{banner}</Text>
              </View>
            ) : null}

            <Input
              label="Email"
              placeholder="you@example.com"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                if (emailErr) setEmailErr(null);
                if (banner) setBanner(null);
              }}
              error={emailErr}
              leftIcon={
                <Icon name="mail" size={18} color={emailErr ? colors.down : colors.textWeak} />
              }
              editable={!anyBusy}
            />

            <Input
              label="密碼"
              placeholder="輸入密碼"
              autoCapitalize="none"
              secureTextEntry={!showPassword}
              textContentType="password"
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                if (pwErr) setPwErr(null);
                if (banner) setBanner(null);
              }}
              error={pwErr}
              leftIcon={
                <Icon name="lock" size={18} color={pwErr ? colors.down : colors.textWeak} />
              }
              rightSlot={
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? '隱藏密碼' : '顯示密碼'}
                  hitSlop={8}
                  onPress={() => setShowPassword((v) => !v)}
                >
                  <Icon name={showPassword ? 'eyeOff' : 'eye'} size={18} color={colors.textWeak} />
                </Pressable>
              }
              editable={!anyBusy}
            />

            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => navigation.navigate('ForgotPassword')}
              style={styles.forgotWrap}
            >
              <Text style={styles.link}>忘記密碼？</Text>
            </Pressable>

            <Button title="登入" onPress={onSignIn} loading={busy} disabled={anyBusy} />

            <View style={styles.divider}>
              <View style={styles.line} />
              <Text style={styles.dividerText}>或</Text>
              <View style={styles.line} />
            </View>

            <GoogleButton
              label="使用 Google 登入"
              onPress={onGoogle}
              loading={googleBusy}
              disabled={anyBusy}
            />
          </View>

          {/* 註冊入口 + demo 略過（置底） */}
          <View style={styles.footer}>
            <View style={styles.signupRow}>
              <Text style={styles.muted}>還沒有帳號？</Text>
              <Pressable
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => navigation.navigate('SignUp')}
              >
                <Text style={styles.link}>建立帳號</Text>
              </Pressable>
            </View>
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={onSkip}
              style={styles.skipWrap}
            >
              <Text style={styles.skip}>略過登入，直接看 Demo →</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.screen },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.page,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
  },
  brand: { alignItems: 'center', gap: spacing.md, paddingTop: spacing.xl },
  tagline: {
    fontFamily: fontFamily.text.medium,
    fontSize: fontSize.text,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  form: { gap: spacing.lg, marginTop: spacing.xxl },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.down,
    backgroundColor: 'rgba(255,94,98,0.10)',
  },
  bannerText: {
    flex: 1,
    fontFamily: fontFamily.text.medium,
    fontSize: fontSize.footnote,
    color: colors.down,
  },
  forgotWrap: { alignSelf: 'flex-end', marginTop: -spacing.sm },
  link: { fontFamily: fontFamily.text.bold, fontSize: fontSize.footnote, color: colors.accent },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.xs,
  },
  line: { flex: 1, height: 1, backgroundColor: colors.divider },
  dividerText: {
    fontFamily: fontFamily.text.medium,
    fontSize: fontSize.label,
    color: colors.textWeak,
  },
  footer: { marginTop: 'auto', paddingTop: spacing.xxl, gap: spacing.lg, alignItems: 'center' },
  signupRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  muted: {
    fontFamily: fontFamily.text.regular,
    fontSize: fontSize.footnote,
    color: colors.textSecondary,
  },
  skipWrap: { paddingVertical: spacing.xs },
  skip: { fontFamily: fontFamily.text.medium, fontSize: fontSize.footnote, color: colors.textWeak },
});
