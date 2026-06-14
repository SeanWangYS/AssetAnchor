import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { Button, Card, Input } from '../../../core/ui';
import { useAuthStore } from '../../auth/authStore';
import { colors, fontFamily, fontSize, spacing } from '../../../core/theme';

/**
 * ProfileScreen —— 個人資料編輯（design.md §1 設定「偏好 / 個人資料」、§2 缺畫面②）。
 *
 * 欄位：顯示名稱 + Email，由 authStore 當前使用者預填。
 *
 * Non-goal：寫回（不呼叫 updateProfile / Firestore）。本頁為純 UI —— 受控 input + 儲存後
 * 顯示「已更新（demo）」提示，不落地。Email 唯讀（變更 email 屬 auth 流程，不在本 WP 範圍）。
 */
export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [saved, setSaved] = useState(false);
  const email = user?.email ?? '';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <Input
          label="顯示名稱"
          value={displayName}
          onChangeText={(t) => {
            setDisplayName(t);
            setSaved(false);
          }}
          placeholder="輸入顯示名稱"
          autoCapitalize="words"
        />
        <Input
          label="電子郵件"
          value={email}
          editable={false}
          placeholder="尚未設定"
          keyboardType="email-address"
        />
        <Text style={styles.hint}>電子郵件由登入帳號決定，無法在此修改。</Text>
      </Card>

      <Button title="儲存" onPress={() => setSaved(true)} />
      {saved ? <Text style={styles.saved}>個人資料已更新（demo，尚未寫回）。</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  content: { padding: spacing.page, gap: spacing.lg },
  card: { gap: spacing.lg },
  hint: {
    fontFamily: fontFamily.text.regular,
    fontSize: fontSize.label,
    color: colors.textWeak,
  },
  saved: {
    fontFamily: fontFamily.text.medium,
    fontSize: fontSize.footnote,
    color: colors.up,
    textAlign: 'center',
  },
});
