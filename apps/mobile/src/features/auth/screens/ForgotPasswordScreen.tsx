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
import { Button, Icon, Input } from '../../../core/ui';
import { colors, fontFamily, fontSize, radius, spacing } from '../../../core/theme';
import type { AuthStackScreenProps } from '../../../core/navigation/types';
import { sendPasswordReset } from '../authService';
import { emailError } from '../validation';

/**
 * ForgotPasswordScreen —— 忘記密碼（auth-flow-spec §2 / §4）。
 * Email 欄位 + 送出 → 成功切到全畫面「信件已寄出」狀態（mail 徽章 + 收件信箱 +
 * 返回登入 / 重新輸入信箱）。inline email 驗證、auth 錯誤橫幅、按鈕 loading。
 * 行為沿用既有 sendPasswordReset。
 */
export default function ForgotPasswordScreen({
  navigation,
}: AuthStackScreenProps<'ForgotPassword'>) {
  useLayoutEffect(() => navigation.setOptions({ headerShown: false }), [navigation]);

  const [email, setEmail] = useState('');
  const [emailErr, setEmailErr] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // 寄信成功後鎖定顯示的收件信箱（全畫面成功態）
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onReset() {
    const eErr = emailError(email);
    setEmailErr(eErr);
    setBanner(null);
    if (eErr) return;

    const trimmed = email.trim();
    setBusy(true);
    const res = await sendPasswordReset(trimmed);
    setBusy(false);
    if (res.ok) setSentTo(trimmed);
    else setBanner(res.errorMessage ?? '寄送失敗，請再試一次。');
  }

  // 重新輸入信箱：回到表單態，保留已輸入值方便修改。
  function onReenter() {
    setSentTo(null);
    setBanner(null);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
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
          {sentTo ? (
            // —— 全畫面成功態 ——
            <View style={styles.successWrap}>
              <View style={styles.badge}>
                <Icon name="mail" size={34} color={colors.accent} />
              </View>
              <Text style={styles.successTitle}>信件已寄出</Text>
              <Text style={styles.successBody}>
                重設密碼連結已寄至{'\n'}
                <Text style={styles.sentEmail}>{sentTo}</Text>
                {'\n'}請至信箱點擊連結完成重設。
              </Text>
              <View style={styles.successActions}>
                <Button title="返回登入" onPress={() => navigation.navigate('SignIn')} />
                <Pressable
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={onReenter}
                  style={styles.reenterWrap}
                >
                  <Text style={styles.link}>重新輸入信箱</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            // —— 表單態 ——
            <View style={styles.formWrap}>
              <View style={styles.head}>
                <Text style={styles.title}>忘記密碼</Text>
                <Text style={styles.subtitle}>輸入註冊信箱，我們會寄送重設密碼連結給你。</Text>
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
                  editable={!busy}
                />

                <Button title="寄送重設連結" onPress={onReset} loading={busy} disabled={busy} />
              </View>

              <View style={styles.footer}>
                <Text style={styles.muted}>想起密碼了？</Text>
                <Pressable
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => navigation.goBack()}
                >
                  <Text style={styles.link}>回登入</Text>
                </Pressable>
              </View>
            </View>
          )}
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

  // 表單態
  formWrap: { flex: 1 },
  head: { gap: spacing.sm, marginTop: spacing.lg },
  title: {
    fontFamily: fontFamily.text.extrabold,
    fontSize: fontSize.title,
    color: colors.textPrimary,
  },
  subtitle: {
    fontFamily: fontFamily.text.regular,
    fontSize: fontSize.text,
    color: colors.textSecondary,
    lineHeight: 22,
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

  // 成功態
  successWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingTop: spacing.xxl,
  },
  badge: {
    width: 84,
    height: 84,
    borderRadius: radius.round,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(124,108,240,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(124,108,240,0.35)',
  },
  successTitle: {
    fontFamily: fontFamily.text.extrabold,
    fontSize: fontSize.cardTitle,
    color: colors.textPrimary,
  },
  successBody: {
    fontFamily: fontFamily.text.regular,
    fontSize: fontSize.text,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  sentEmail: { fontFamily: fontFamily.text.bold, color: colors.textPrimary },
  successActions: {
    alignSelf: 'stretch',
    gap: spacing.lg,
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  reenterWrap: { paddingVertical: spacing.xs },
});
