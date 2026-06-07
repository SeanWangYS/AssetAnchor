import { useLayoutEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import type { AccountsStackScreenProps } from '../../../core/navigation/types';
import { useAccountsStore } from '../accountsStore';
import { ListItem } from '../../../core/ui';
import { colors, fontSize, spacing } from '../../../core/theme';
import { zhTW } from '../../../i18n/zh-TW';

export default function AccountListScreen({ navigation }: AccountsStackScreenProps<'AccountList'>) {
  const accounts = useAccountsStore((s) => s.accounts);
  const [showInactive, setShowInactive] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable accessibilityRole="button" onPress={() => navigation.navigate('AddAccount')}>
          <Text style={styles.add}>＋</Text>
        </Pressable>
      ),
    });
  }, [navigation]);

  const visible = showInactive ? accounts : accounts.filter((a) => a.is_active);

  return (
    <ScrollView>
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
  );
}

const styles = StyleSheet.create({
  add: { fontSize: fontSize.title, color: colors.primary, paddingHorizontal: spacing.sm },
  empty: { padding: spacing.xl, textAlign: 'center', color: colors.textMuted },
  badge: { fontSize: fontSize.caption, color: colors.textMuted },
  toggle: { padding: spacing.lg, alignItems: 'center' },
  toggleText: { color: colors.primary, fontSize: fontSize.body },
});
