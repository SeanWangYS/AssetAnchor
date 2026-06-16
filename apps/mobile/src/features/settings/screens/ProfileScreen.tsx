import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { DISPLAY_NAME_MAX_LENGTH, validateDisplayName } from '@assetanchor/shared';
import { Button, Card, Input, Toast } from '../../../core/ui';
import { useAuthStore } from '../../auth/authStore';
import { getUserDoc, updateUserProfile } from '../../auth/userDoc';
import { colors, fontFamily, fontSize, spacing } from '../../../core/theme';

/**
 * ProfileScreen —— 個人資料編輯（design.md §1 設定「偏好 / 個人資料」、§2 缺畫面②）。
 *
 * 欄位：顯示名稱（可寫回）+ Email（唯讀）。mount 時由 users/{uid}.display_name 載入現值
 * （缺值 fallback Auth displayName）；「儲存」寫回 Firestore + Auth profile（userDoc.updateUserProfile）。
 * 寫回前以 shared 的 validateDisplayName gate；成功 Toast、失敗 inline 錯誤。
 * Email 唯讀（變更 email 屬 auth 流程，不在本 WP 範圍）。
 */
export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const email = user?.email ?? '';

  // loadedName = 最後一次已持久化的值（dirty 判斷基準）；displayName = 受控輸入。
  const initialName = user?.displayName ?? '';
  const [loadedName, setLoadedName] = useState(initialName);
  const [displayName, setDisplayName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [saveError, setSaveError] = useState(false);

  // mount：由 user doc 載入現值（缺值 fallback Auth displayName → ''）。
  useEffect(() => {
    let active = true;
    void getUserDoc().then((doc) => {
      if (!active) return;
      const name = doc?.display_name ?? user?.displayName ?? '';
      setLoadedName(name);
      setDisplayName(name);
    });
    return () => {
      active = false;
    };
  }, [user?.displayName]);

  const validation = validateDisplayName(displayName);
  const tooLong = !validation.ok && validation.reason === 'too_long';
  const canSave = validation.ok && validation.value !== loadedName && !saving;

  async function onSave() {
    if (!validation.ok) return;
    setSaving(true);
    setSaveError(false);
    try {
      await updateUserProfile({ display_name: validation.value });
      setLoadedName(validation.value);
      setDisplayName(validation.value);
      setToast('個人資料已更新');
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <Input
          label="顯示名稱"
          value={displayName}
          onChangeText={(t) => {
            setDisplayName(t);
            setSaveError(false);
          }}
          placeholder="輸入顯示名稱"
          autoCapitalize="words"
          error={tooLong ? `顯示名稱過長（上限 ${DISPLAY_NAME_MAX_LENGTH} 字）` : null}
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

      <Button title="儲存" onPress={onSave} disabled={!canSave} loading={saving} />
      {saveError ? <Text style={styles.error}>儲存失敗，請稍後再試。</Text> : null}

      <Toast visible={toast !== null} message={toast ?? ''} onHide={() => setToast(null)} />
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
  error: {
    fontFamily: fontFamily.text.medium,
    fontSize: fontSize.footnote,
    color: colors.down,
    textAlign: 'center',
  },
});
