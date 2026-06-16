import { useMemo, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { RootStackScreenProps } from '../../../core/navigation/types';
import { Icon } from '../../../core/ui';
import {
  colors,
  fontFamily,
  fontSize,
  gradientDirection,
  numericStyle,
  radius,
  spacing,
} from '../../../core/theme';
import { useTransactionsStore } from '../transactionsStore';
import {
  PRESET_LABEL,
  PRESET_ORDER,
  filterByPreset,
  useDateRangeStore,
  type DateRangePreset,
} from '../dateRangeStore';

/**
 * DateRangeSheetScreen —— 期間篩選（transactions-page-spec T5）。
 * presets（全部/本月/近三月/今年）即時計算命中筆數；套用後寫入 dateRangeStore
 * 並關閉（清單反應式重繪）。自訂起訖為 Phase 2 待辦（顯示但暫不生效，見 flag）。
 *
 * 以 Root modal（presentation:'modal'）呈現；RootStack 已設標題「期間篩選」與深色 header。
 */
export default function DateRangeSheetScreen({ navigation }: RootStackScreenProps<'DateRange'>) {
  const current = useDateRangeStore((s) => s.preset);
  const setPreset = useDateRangeStore((s) => s.setPreset);
  const transactions = useTransactionsStore((s) => s.transactions);

  const [sel, setSel] = useState<DateRangePreset>(current === 'custom' ? 'all' : current);

  const count = useMemo(() => filterByPreset(transactions, sel).length, [transactions, sel]);

  function apply() {
    setPreset(sel);
    navigation.goBack();
  }

  return (
    <View style={styles.sheet}>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>日期區間</Text>
        <Pressable accessibilityRole="button" onPress={() => setSel('all')}>
          <Text style={styles.reset}>重設</Text>
        </Pressable>
      </View>

      <View style={styles.presets}>
        {PRESET_ORDER.map((p) => {
          const on = p === sel;
          if (on) {
            return (
              <LinearGradient
                key={p}
                colors={[colors.accent, `${colors.accent}cc`]}
                start={gradientDirection.diagonal160.start}
                end={gradientDirection.diagonal160.end}
                style={styles.presetOn}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: true }}
                  onPress={() => setSel(p)}
                  style={styles.presetPress}
                >
                  <Text style={[styles.presetText, styles.presetTextOn]}>{PRESET_LABEL[p]}</Text>
                </Pressable>
              </LinearGradient>
            );
          }
          return (
            <Pressable
              key={p}
              accessibilityRole="button"
              accessibilityState={{ selected: false }}
              onPress={() => setSel(p)}
              style={styles.presetOff}
            >
              <Text style={styles.presetText}>{PRESET_LABEL[p]}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* 自訂起訖（Phase 2 待辦：UI 佔位，套用時退回「全部」）。 */}
      <View style={styles.customRow}>
        {(['起', '訖'] as const).map((k) => (
          <View key={k} style={styles.customCol}>
            <Text style={styles.customLabel}>{k}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setSel('all')}
              style={styles.customField}
            >
              <Text style={styles.customValue}>選擇日期</Text>
              <Icon name="calendar" size={16} color={colors.textFaint} />
            </Pressable>
          </View>
        ))}
      </View>

      <Pressable accessibilityRole="button" onPress={apply} style={styles.applyWrap}>
        <LinearGradient
          colors={[colors.accent, `${colors.accent}cc`]}
          start={gradientDirection.diagonal160.start}
          end={gradientDirection.diagonal160.end}
          style={styles.apply}
        >
          <Text style={styles.applyText}>套用（{count} 筆）</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.screen, padding: spacing.page },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.md + 2,
  },
  heading: {
    fontFamily: fontFamily.text.bold,
    fontSize: fontSize.text,
    color: colors.textPrimary,
  },
  reset: { fontFamily: fontFamily.text.regular, fontSize: 13, color: colors.textSecondary },
  presets: { flexDirection: 'row', gap: 7, flexWrap: 'wrap' },
  presetOn: {
    borderRadius: 100,
    shadowColor: colors.accent,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  presetPress: { paddingVertical: 7, paddingHorizontal: spacing.lg - 2 },
  presetOff: {
    paddingVertical: 7,
    paddingHorizontal: spacing.lg - 2,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetText: {
    fontFamily: fontFamily.text.medium,
    fontSize: 12,
    color: colors.textSecondary,
  },
  presetTextOn: { fontFamily: fontFamily.text.bold, color: colors.onPrimary },
  customRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  customCol: { flex: 1 },
  customLabel: {
    fontFamily: fontFamily.text.regular,
    fontSize: 11.5,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  customField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 46,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  customValue: {
    fontFamily: fontFamily.text.regular,
    fontSize: 13,
    color: colors.textFaint,
    ...numericStyle,
  },
  applyWrap: {
    marginTop: spacing.lg + 2,
    borderRadius: radius.lg,
    overflow: 'hidden',
    shadowColor: colors.accent,
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
  },
  apply: { paddingVertical: spacing.md + 1, alignItems: 'center', justifyContent: 'center' },
  applyText: {
    fontFamily: fontFamily.text.extrabold,
    fontSize: 14,
    color: colors.onPrimary,
  },
});
