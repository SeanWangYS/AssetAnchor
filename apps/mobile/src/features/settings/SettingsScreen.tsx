import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { SettingsStackScreenProps } from '../../core/navigation/types';
import { useAuthStore } from '../auth/authStore';
import { signOut } from '../auth/authService';
import { AABrandLockup, Card, ConfirmDialog, Icon, ListItem } from '../../core/ui';
import { colors, fontFamily, fontSize, spacing } from '../../core/theme';

/** 可導航列右側的 chevron（弱色，1.8-stroke）。 */
function rowChevron() {
  return <Icon name="chevron" color={colors.textFaint} size={18} />;
}

/**
 * SettingsScreen（SettingsHome）—— 設定落地頁（design.md §1 / analysis-page-spec §3.2）。
 *
 * 由上到下：
 * 1. 「我的帳號」card —— AABrandLockup（圓環錨點品牌）+ 使用者 email。
 * 2. 分組清單：帳戶（帳戶管理 / 現金餘額）/ 偏好（顯示偏好 / 個人資料）/ 其他（關於），列尾 chevron。
 * 3. 破壞性「登出」 → 置中 ConfirmDialog（破壞性紅，auth-flow-spec §6）。
 *
 * 登出採既有跨切面模式：authService.signOut()（Firebase）→ onAuthStateChanged 翻 authStore.user=null
 * → RootNavigator 換回 AuthStack（authStore 本身不持有 logout action）。
 * 「帳戶管理 / 現金餘額」皆 navigate 到本 stack 既有的 Accounts 子頁（現金餘額於帳戶詳情內以
 * CashBalanceCard 編輯；尚無獨立現金頁）。
 */
export default function SettingsScreen({ navigation }: SettingsStackScreenProps<'SettingsHome'>) {
  const email = useAuthStore((s) => s.user?.email);
  const [confirmLogout, setConfirmLogout] = useState(false);

  return (
    <>
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
          <ListItem
            title="現金餘額"
            right={rowChevron()}
            divider={false}
            onPress={() => navigation.navigate('Accounts')}
          />
        </View>

        {/* 偏好 */}
        <Text style={styles.groupLabel}>偏好</Text>
        <View style={styles.group}>
          <ListItem
            title="顯示偏好"
            right={rowChevron()}
            onPress={() => navigation.navigate('DisplayPrefs')}
          />
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

        {/* 破壞性：登出 */}
        <View style={styles.signOutWrap}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setConfirmLogout(true)}
            style={({ pressed }) => [styles.signOutBtn, pressed ? styles.pressed : null]}
          >
            <Text style={styles.signOut}>登出</Text>
          </Pressable>
        </View>
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

  signOutWrap: { paddingTop: spacing.xxl, paddingBottom: spacing.lg, alignItems: 'center' },
  signOutBtn: { paddingVertical: spacing.sm, paddingHorizontal: spacing.xl },
  pressed: { opacity: 0.6 },
  signOut: { fontFamily: fontFamily.text.semibold, fontSize: fontSize.body, color: colors.danger },
});
