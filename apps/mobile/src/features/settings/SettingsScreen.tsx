import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { SettingsStackScreenProps } from '../../core/navigation/types';
import { signOut } from '../auth/authService';
import { Icon, ListItem } from '../../core/ui';
import { colors, fontFamily, fontSize, spacing } from '../../core/theme';

/** 可導航列右側的 chevron（弱色，1.8-stroke）。 */
function rowChevron() {
  return <Icon name="chevron" color={colors.textFaint} size={20} />;
}

/**
 * SettingsHome —— 設定落地頁（分組清單：帳戶 / 偏好 / 其他 + 破壞性「登出」）。
 * 帳戶管理現為設定子頁（push 巢狀 AccountsStack）。
 *
 * TODO(Phase 4 WP-E)：我的帳號 card + 完整分組樣式 + 登出 ConfirmDialog
 * （design.md §1 設定）。目前為精簡可導航清單，登出沿用既有 authService。
 */
export default function SettingsScreen({ navigation }: SettingsStackScreenProps<'SettingsHome'>) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.groupLabel}>帳戶</Text>
      <ListItem
        title="帳戶管理"
        right={rowChevron()}
        onPress={() => navigation.navigate('Accounts')}
      />

      <Text style={styles.groupLabel}>偏好</Text>
      <ListItem
        title="顯示偏好"
        right={rowChevron()}
        onPress={() => navigation.navigate('DisplayPrefs')}
      />
      <ListItem
        title="個人資料"
        right={rowChevron()}
        onPress={() => navigation.navigate('Profile')}
      />

      <Text style={styles.groupLabel}>其他</Text>
      <ListItem title="關於" right={rowChevron()} onPress={() => navigation.navigate('About')} />

      <View style={styles.signOutWrap}>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void signOut();
          }}
        >
          <Text style={styles.signOut}>登出</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  content: { paddingVertical: spacing.lg },
  groupLabel: {
    paddingHorizontal: spacing.page,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
    fontFamily: fontFamily.text.semibold,
    fontSize: fontSize.label,
    color: colors.textWeak,
  },
  signOutWrap: { padding: spacing.xl, alignItems: 'center' },
  signOut: { fontFamily: fontFamily.text.semibold, fontSize: fontSize.body, color: colors.danger },
});
