import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { SettingsStackScreenProps } from '../../core/navigation/types';
import { useAuthStore } from '../auth/authStore';
import { signOut } from '../auth/authService';
import { useAccountsStore } from '../accounts/accountsStore';
import { formatCashTotals } from '../accounts/accountDisplay';
import { AABrandLockup, Card, ConfirmDialog, Icon, ListItem, ScreenHeader } from '../../core/ui';
import { colors, fontFamily, fontSize, radius, spacing } from '../../core/theme';

/** 可導航列右側的 chevron（弱色，1.8-stroke）。 */
function rowChevron() {
  return <Icon name="chevron" color={colors.textFaint} size={18} />;
}

/**
 * SettingsScreen（SettingsHome）—— 設定落地頁（design.md §1 / analysis-page-spec §3.2）。
 *
 * 由上到下：
 * 1. 「我的帳號」card —— AABrandLockup（圓環錨點品牌）+ 使用者 email。
 * 2. 分組清單：帳戶（帳戶管理 / 現金餘額）/ 偏好（個人資料）/ 其他（關於），列尾 chevron。
 *    （顯示幣別切換已移至持倉頁＝偏好控制；原「顯示偏好」子頁移除。）
 * 3. 破壞性「登出」 → 置中 ConfirmDialog（破壞性紅，auth-flow-spec §6）。
 *
 * 登出採既有跨切面模式：authService.signOut()（Firebase）→ onAuthStateChanged 翻 authStore.user=null
 * → RootNavigator 換回 AuthStack（authStore 本身不持有 logout action）。
 * 「帳戶管理」navigate 到本 stack 既有的 Accounts 子頁；「現金餘額」為唯讀展示列，右側顯示
 * 跨帳戶現金總計（由 accountsStore 各啟用帳戶 cash_balances 依幣別 Money 加總），不可點、不導航
 * （現金的逐帳戶編輯仍於帳戶詳情 CashBalanceCard，對齊 analysis-page-spec §3.2 設定頁 mock）。
 */
export default function SettingsScreen({ navigation }: SettingsStackScreenProps<'SettingsHome'>) {
  const email = useAuthStore((s) => s.user?.email);
  const accounts = useAccountsStore((s) => s.accounts);
  const [confirmLogout, setConfirmLogout] = useState(false);

  // 跨（啟用）帳戶現金總計（依幣別以 Money 加總；僅顯示有餘額幣別），如「NT$ X · US$ Y」。
  const cashTotal = useMemo(() => formatCashTotals(accounts), [accounts]);

  return (
    <>
      <ScreenHeader title="設定" />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        {/* 我的帳號 card */}
        <Card glow style={styles.accountCard}>
          <AABrandLockup markSize={40} wordSize={22} glow />
          <View style={styles.accountMeta}>
            <Text style={styles.accountLabel}>我的帳號</Text>
            <Text style={styles.accountEmail} numberOfLines={1}>
              {email ?? '尚未登入'}
            </Text>
          </View>
        </Card>

        {/* 帳戶 */}
        <Text style={styles.groupLabel}>帳戶</Text>
        <View style={styles.group}>
          <ListItem
            title="帳戶管理"
            right={rowChevron()}
            onPress={() => navigation.navigate('Accounts')}
          />
          {/* 現金餘額：唯讀展示列（不可點、無 chevron），右側為跨帳戶現金總計（對齊原型 mock）。 */}
          <ListItem
            title="現金餘額"
            right={<Text style={styles.cashTotal}>{cashTotal}</Text>}
            divider={false}
          />
        </View>

        {/* 偏好 */}
        <Text style={styles.groupLabel}>偏好</Text>
        <View style={styles.group}>
          <ListItem
            title="個人資料"
            right={rowChevron()}
            divider={false}
            onPress={() => navigation.navigate('Profile')}
          />
        </View>

        {/* 其他 */}
        <Text style={styles.groupLabel}>其他</Text>
        <View style={styles.group}>
          <ListItem
            title="關於"
            right={rowChevron()}
            divider={false}
            onPress={() => navigation.navigate('About')}
          />
        </View>

        {/* 破壞性：登出 —— 紅色按鈕（對齊 prototype aa-screens-v2 登出鈕：淡紅底 + 紅邊 + 紅字，
            非實心 danger，破壞性確認仍交給 ConfirmDialog）。 */}
        <Pressable
          accessibilityRole="button"
          onPress={() => setConfirmLogout(true)}
          style={({ pressed }) => [styles.signOutBtn, pressed ? styles.pressed : null]}
        >
          <Text style={styles.signOut}>登出</Text>
        </Pressable>
      </ScrollView>

      <ConfirmDialog
        visible={confirmLogout}
        danger
        title="登出"
        message="確定要登出嗎？下次需重新輸入帳號密碼。"
        confirmLabel="登出"
        onClose={() => setConfirmLogout(false)}
        onConfirm={() => {
          setConfirmLogout(false);
          void signOut();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  content: { paddingHorizontal: spacing.page, paddingVertical: spacing.lg, gap: spacing.xs },

  accountCard: { gap: spacing.lg },
  accountMeta: { gap: 2 },
  accountLabel: {
    fontFamily: fontFamily.text.semibold,
    fontSize: fontSize.label,
    color: colors.textWeak,
  },
  accountEmail: {
    fontFamily: fontFamily.text.medium,
    fontSize: fontSize.text,
    color: colors.textPrimary,
  },
  // 現金餘額唯讀總計（數字字體、弱色，右對齊；對齊 mock 的次標數值樣式）。
  cashTotal: {
    fontFamily: fontFamily.num.medium,
    fontSize: fontSize.footnote,
    color: colors.textSecondary,
  },

  groupLabel: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
    fontFamily: fontFamily.text.semibold,
    fontSize: fontSize.label,
    color: colors.textWeak,
  },
  // 分組卡：把 ListItem 的頁面 padding 收進卡內（ListItem 自帶 paddingHorizontal: page），
  // 以負 margin 抵銷讓列與卡邊對齊。
  group: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: -spacing.page,
  },

  // 登出紅色按鈕：淡紅底（~8%）+ 紅邊（~28%）+ 紅粗字，full-width（對齊 prototype）。
  signOutBtn: {
    marginTop: spacing.xxl,
    marginBottom: spacing.lg,
    minHeight: 50,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${colors.danger}14`,
    borderWidth: 1,
    borderColor: `${colors.danger}47`,
  },
  pressed: { opacity: 0.7 },
  signOut: {
    fontFamily: fontFamily.text.bold,
    fontSize: fontSize.body,
    color: colors.danger,
    letterSpacing: 0.5,
  },
});
