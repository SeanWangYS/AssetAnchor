import { useState } from 'react';
import { Linking, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Icon, Toast } from '../../../core/ui';
import { colors, fontFamily, fontSize, radius, spacing } from '../../../core/theme';
import { CLAUDE_CONNECTOR_URL, CLAUDE_CONNECTORS_SETTINGS_URL } from '../claudeImport';

const STEPS = [
  '在 claude.ai 開啟「設定 → Connectors」，選擇新增自訂 connector。',
  '名稱填「AssetAnchor」，網址貼上上方的 connector 網址。',
  '按「連線」，用你的 AssetAnchor 帳號登入並允許存取。',
  '在對話中上傳交易截圖，告訴 Claude 要匯入哪個帳戶。',
];

const NOTES = [
  '匯入前 Claude 會逐筆列出交易，你確認後才會寫入。',
  '目前只支援買入與賣出，股利等其他類型會略過。',
  '也可以請 Claude 修改或刪除交易，同樣會先讓你確認；刪除後無法復原。',
  '要中斷連線，到 Claude 的 connector 設定移除 AssetAnchor 即可。',
];

/**
 * ClaudeImportScreen —— 用 Claude 匯入交易（docs/design/claude-import/claude-import-spec.md）。
 *
 * Static guide: connector URL (selectable, shareable), the four setup steps and what to expect.
 * Uses the built-in Share / Linking APIs so no native module is added.
 */
export default function ClaudeImportScreen() {
  const [toast, setToast] = useState<string | null>(null);

  const share = () => {
    void Share.share({ message: CLAUDE_CONNECTOR_URL }).catch(() => undefined);
  };
  const openClaude = () => {
    Linking.openURL(CLAUDE_CONNECTORS_SETTINGS_URL).catch(() =>
      setToast('無法開啟連結，請手動前往 claude.ai'),
    );
  };

  return (
    <>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.intro}>
          <Text style={styles.title}>把截圖交給 Claude，交易自動入帳</Text>
          <Text style={styles.body}>
            在 Claude 上傳券商 App 或對帳單的交易截圖，Claude 會整理成交易清單，經你逐筆確認後寫入
            AssetAnchor。
          </Text>
        </View>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Connector 網址</Text>
          <View style={styles.urlBox}>
            <Text style={styles.url} selectable>
              {CLAUDE_CONNECTOR_URL}
            </Text>
          </View>
          <View style={styles.actions}>
            <Button title="開啟 Claude 設定" onPress={openClaude} />
            <Button title="分享網址" variant="secondary" onPress={share} />
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>設定步驟</Text>
          {STEPS.map((step, i) => (
            <View
              key={step}
              style={styles.step}
              accessible
              accessibilityLabel={`第 ${i + 1} 步，${step}`}
            >
              <View style={styles.badge} importantForAccessibility="no-hide-descendants">
                <Text style={styles.badgeText}>{i + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>你需要知道的事</Text>
          {NOTES.map((note) => (
            <View key={note} style={styles.note}>
              <View style={styles.noteIcon}>
                <Icon name="check" color={colors.accent} size={16} />
              </View>
              <Text style={styles.stepText}>{note}</Text>
            </View>
          ))}
        </Card>

        <Text style={styles.footnote}>
          需要 Claude 帳號；讀取截圖的費用由你的 Claude 方案負擔。
        </Text>
      </ScrollView>
      <Toast visible={toast !== null} message={toast ?? ''} onHide={() => setToast(null)} />
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  content: { padding: spacing.page, gap: spacing.xl },
  intro: { gap: spacing.sm },
  title: {
    fontFamily: fontFamily.text.bold,
    fontSize: fontSize.heading,
    color: colors.textPrimary,
  },
  body: {
    fontFamily: fontFamily.text.regular,
    fontSize: fontSize.footnote,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  card: { gap: spacing.md },
  sectionTitle: {
    fontFamily: fontFamily.text.bold,
    fontSize: fontSize.body,
    color: colors.textPrimary,
  },
  urlBox: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  url: {
    fontFamily: fontFamily.num.medium,
    fontSize: fontSize.text,
    color: colors.textPrimary,
  },
  actions: { gap: spacing.sm },
  step: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  badge: {
    width: 24,
    height: 24,
    borderRadius: radius.round,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  badgeText: {
    fontFamily: fontFamily.num.bold,
    fontSize: fontSize.label,
    color: colors.onPrimary,
  },
  stepText: {
    flex: 1,
    fontFamily: fontFamily.text.regular,
    fontSize: fontSize.footnote,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  note: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  noteIcon: { marginTop: 3 },
  footnote: {
    fontFamily: fontFamily.text.regular,
    fontSize: fontSize.label,
    color: colors.textWeak,
    textAlign: 'center',
  },
});
