import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { AccountsStackScreenProps } from '../../../core/navigation/types';
import { useAccountsStore } from '../accountsStore';
import { Fab, Icon, ListItem } from '../../../core/ui';
import { colors, fontSize, spacing } from '../../../core/theme';
import { zhTW } from '../../../i18n/zh-TW';

/**
 * AccountListScreen —— 帳戶清單（設定 → 帳戶管理子頁）。
 * 新增帳戶入口 = **FAB**（design.md §1：帳戶 FAB，header ＋ 已移除，AccountsStack 現掛在設定下）。
 */
export default function AccountListScreen({ navigation }: AccountsStackScreenProps<'AccountList'>) {
  const accounts = useAccountsStore((s) => s.accounts);
  const [showInactive, setShowInactive] = useState(false);

  const visible = showInactive ? accounts : accounts.filter((a) => a.is_active);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {visible.length === 0 ? (
          <Text style={styles.empty}>{zhTW.accounts.empty}</Text>
        ) : (
          visible.map((a) => (
            <ListItem
              key={a.account_id}
              title={a.account_name}
              subtitle={`${a.broker} · ${a.base_currency}`}
              colorDot={a.color}
              dimmed={!a.is_active}
              right={
                a.is_active ? undefined : (
                  <Text style={styles.badge}>{zhTW.accounts.inactiveBadge}</Text>
                )
              }
              onPress={() => navigation.navigate('AccountDetail', { accountId: a.account_id })}
            />
          ))
        )}
        <Pressable
          accessibilityRole="button"
          style={styles.toggle}
          onPress={() => setShowInactive((v) => !v)}
        >
          <Text style={styles.toggleText}>
            {showInactive ? zhTW.accounts.hideInactive : zhTW.accounts.showInactive}
          </Text>
        </Pressable>
      </ScrollView>
      <Fab
        onPress={() => navigation.navigate('AddAccount')}
        accessibilityLabel={zhTW.accounts.actions.create}
        icon={<Icon name="plus" color={colors.onPrimary} size={28} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  content: { flexGrow: 1 },
  empty: { padding: spacing.xl, textAlign: 'center', color: colors.textMuted },
  badge: { fontSize: fontSize.caption, color: colors.textMuted },
  toggle: { padding: spacing.lg, alignItems: 'center' },
  toggleText: { color: colors.primary, fontSize: fontSize.body },
});
