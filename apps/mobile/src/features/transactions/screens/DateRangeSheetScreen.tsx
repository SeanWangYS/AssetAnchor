import { useMemo, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { isRealDate } from '@assetanchor/shared';
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
  isValidCustomRange,
  useDateRangeStore,
  type DateRangePreset,
} from '../dateRangeStore';

/**
 * DateRangeSheetScreen —— 期間篩選（transactions-page-spec T5）。
 * presets（全部/本月/近三月/今年）＋自訂起訖（YYYY-MM-DD 受控文字輸入，沿用交易表單
 * DateField 慣例、MVP 不引第三方 picker；fix-visual-audit-p0p1）即時計算命中筆數；
 * 套用後寫入 dateRangeStore 並關閉（清單反應式重繪）。
 *
 * 狀態機：雙欄皆為合法日期才切入 custom（單欄不觸發，避免輸入被靜默忽略）；
 * custom 且區間非法（缺欄/起>訖）→ 套用鈕 disabled；選 preset 清空起訖；
 * 重開 sheet 保留 custom 選取並回填起訖（初始化不再退回 all）。
 *
 * 以 Root modal（presentation:'modal'）呈現；RootStack 已設標題「期間篩選」與深色 header。
 */
export default function DateRangeSheetScreen({ navigation }: RootStackScreenProps<'DateRange'>) {
  const current = useDateRangeStore((s) => s.preset);
  const storedCustom = useDateRangeStore((s) => s.custom);
  const setPreset = useDateRangeStore((s) => s.setPreset);
  const setCustomRange = useDateRangeStore((s) => s.setCustomRange);
  const transactions = useTransactionsStore((s) => s.transactions);

  // 重開 sheet 保留 custom（visual-audit 設計稽核必改點：原本 custom 會被退回 all）
  const [sel, setSel] = useState<DateRangePreset>(current);
  const [start, setStart] = useState(current === 'custom' ? storedCustom.start : '');
  const [end, setEnd] = useState(current === 'custom' ? storedCustom.end : '');

  const range = { start: start.trim(), end: end.trim() };
  const bothValid = isRealDate(range.start) && isRealDate(range.end);
  const rangeError = bothValid && range.start > range.end;
  const canApply = sel !== 'custom' || isValidCustomRange(range);

  const count = useMemo(
    () => filterByPreset(transactions, sel, new Date(), range).length,
    [transactions, sel, range.start, range.end],
  );

  /** 起訖輸入：雙欄皆合法才自動切 custom；已在 custom 則停留（由套用鈕 disable 把關）。 */
  function onChangeDate(which: '起' | '訖', value: string) {
    const nextStart = which === '起' ? value : start;
    const nextEnd = which === '訖' ? value : end;
    if (which === '起') setStart(value);
    else setEnd(value);
    if (isRealDate(nextStart.trim()) && isRealDate(nextEnd.trim())) setSel('custom');
  }

  function onSelectPreset(p: DateRangePreset) {
    setSel(p);
    // 選 preset 清空自訂輸入（spec delta：兩者互斥）
    setStart('');
    setEnd('');
  }

  function apply() {
    if (!canApply) return;
    if (sel === 'custom') setCustomRange(range);
    else setPreset(sel);
    navigation.goBack();
  }

  return (
    <View style={styles.sheet}>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>日期區間</Text>
        <Pressable accessibilityRole="button" onPress={() => onSelectPreset('all')}>
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
                  onPress={() => onSelectPreset(p)}
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
              onPress={() => onSelectPreset(p)}
              style={styles.presetOff}
            >
              <Text style={styles.presetText}>{PRESET_LABEL[p]}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* 自訂起訖：YYYY-MM-DD 受控輸入（雙欄合法自動選取自訂；spec T5） */}
      <View style={styles.customRow}>
        {(
          [
            ['起', start],
            ['訖', end],
          ] as const
        ).map(([k, value]) => (
          <View key={k} style={styles.customCol}>
            <Text style={styles.customLabel}>{k}</Text>
            <View style={[styles.customField, sel === 'custom' && styles.customFieldOn]}>
              <TextInput
                testID={`date-range-${k === '起' ? 'start' : 'end'}`}
                value={value}
                onChangeText={(v) => onChangeDate(k, v)}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textFaint}
                keyboardType="numbers-and-punctuation"
                autoCorrect={false}
                autoCapitalize="none"
                style={styles.customInput}
              />
              <Icon name="calendar" size={16} color={colors.textFaint} />
            </View>
          </View>
        ))}
      </View>
      {rangeError ? <Text style={styles.rangeError}>起日需早於訖日</Text> : null}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !canApply }}
        onPress={apply}
        disabled={!canApply}
        style={[styles.applyWrap, !canApply && styles.applyDisabled]}
      >
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
  customFieldOn: { borderColor: colors.accent },
  customInput: {
    flex: 1,
    fontFamily: fontFamily.text.regular,
    fontSize: 13,
    color: colors.textPrimary,
    paddingVertical: 0,
    ...numericStyle,
  },
  rangeError: {
    fontFamily: fontFamily.text.regular,
    fontSize: 12,
    color: colors.danger,
    marginTop: spacing.sm,
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
  applyDisabled: { opacity: 0.4 },
  apply: { paddingVertical: spacing.md + 1, alignItems: 'center', justifyContent: 'center' },
  applyText: {
    fontFamily: fontFamily.text.extrabold,
    fontSize: 14,
    color: colors.onPrimary,
  },
});
