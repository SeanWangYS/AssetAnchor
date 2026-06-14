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
import { signInWithGoogle, signUpWithEmail } from '../authService';
import GoogleButton from '../components/GoogleButton';
import { emailError, passwordError } from '../validation';

/**
 * SignUpScreen —— 建立帳號（auth-flow-spec §2，SignIn push）。
 * 與 SignIn 同欄位（Email + 密碼）；Google 註冊、inline 驗證、auth 錯誤橫幅、按鈕 loading。
 * 行為沿用既有 signUpWithEmail / signInWithGoogle（含 createUserDocIfMissing）。
 */
export default function SignUpScreen({ navigation }: AuthStackScreenProps<'SignUp'>) {
  // 全屏版面自帶 layout（含返回鈕），隱藏 AuthStack 預設 header。
  useLayoutEffect(() => navigation.setOptions({ headerShown: false }), [navigation]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [emailErr, setEmailErr] = useState<string | null>(null);
  const [pwErr, setPwErr] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const anyBusy = busy || googleBusy;

  async function onSignUp() {
    const eErr = emailError(email);
    const pErr = passwordError(password);
    setEmailErr(eErr);
    setPwErr(pErr);
    setBanner(null);
    if (eErr || pErr) return;

    setBusy(true);
    const res = await signUpWithEmail(email.trim(), password);
    setBusy(false);
    if (!res.ok) setBanner(res.errorMessage ?? '註冊失敗，請再試一次。');
  }

  // Google 註冊與登入共用同一憑證流程（signInWithGoogle 內含 createUserDocIfMissing）。
  async function onGoogle() {
    setGoogleBusy(true);
    setBanner(null);
    const res = await signInWithGoogle();
    setGoogleBusy(false);
    if (!res.ok) setBanner(res.errorMessage ?? 'Google 註冊失敗，請再試一次。');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* 輕量返回列（已隱藏原生 header） */}
        <View style={styles.topbar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="返回"
            hitSlop={10}
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <Icon name="back" size={22} color={colors.textPrimary} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brand}>
            <AABrandLockup markSize={40} wordSize={22} glow />
          </View>

          <View style={styles.head}>
            <Text style={styles.title}>建立帳號</Text>
            <Text style={styles.subtitle}>開始把你的資產錨定在一處</Text>
          </View>

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
              placeholder="至少 6 碼"
              autoCapitalize="none"
              secureTextEntry={!showPassword}
              textContentType="newPassword"
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

            <Button title="建立帳號" onPress={onSignUp} loading={busy} disabled={anyBusy} />

            <View style={styles.divider}>
              <View style={styles.line} />
              <Text style={styles.dividerText}>或</Text>
              <View style={styles.line} />
            </View>

            <GoogleButton
              label="使用 Google 註冊"
              onPress={onGoogle}
              loading={googleBusy}
              disabled={anyBusy}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.muted}>已經有帳號了？</Text>
            <Pressable accessibilityRole="button" hitSlop={8} onPress={() => navigation.goBack()}>
              <Text style={styles.link}>回登入</Text>
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
  topbar: {
    paddingHorizontal: spacing.page,
    paddingTop: spacing.xs,
    height: 44,
    justifyContent: 'center',
  },
  backBtn: { width: 32, height: 32, alignItems: 'flex-start', justifyContent: 'center' },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.page,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  brand: { alignItems: 'center', paddingTop: spacing.sm },
  head: { alignItems: 'center', gap: spacing.xs, marginTop: spacing.xl },
  title: {
    fontFamily: fontFamily.text.extrabold,
    fontSize: fontSize.title,
    color: colors.textPrimary,
  },
  subtitle: {
    fontFamily: fontFamily.text.regular,
    fontSize: fontSize.footnote,
    color: colors.textSecondary,
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
  footer: {
    marginTop: 'auto',
    paddingTop: spacing.xxl,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  muted: {
    fontFamily: fontFamily.text.regular,
    fontSize: fontSize.footnote,
    color: colors.textSecondary,
  },
  link: { fontFamily: fontFamily.text.bold, fontSize: fontSize.footnote, color: colors.accent },
});
