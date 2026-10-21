import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type TextStyle } from 'react-native';
import { colors, fontFamily, numericStyle } from '../../../core/theme';
import type { HoldingsSort, HoldingsSortKey } from '../../../services/localPrefs/holdingsSort';
import type { CellTone, HoldingTableRow, SortableColumn, TableSection } from '../holdingsTable';

/**
 * Holdings table (design spec D10): a frozen symbol column plus ONE horizontal ScrollView
 * holding the header, group rows and data rows, so every row scrolls together. Both
 * sides render the same row sequence with fixed heights (header 34, group 34, row 46),
 * which keeps them aligned without measuring. No borders, no scroll hint (owner).
 */

const FROZEN_WIDTH = 76;
const HEADER_HEIGHT = 34;
const GROUP_HEIGHT = 34;
const ROW_HEIGHT = 46;
const MV_WIDTH = 104;

const COLUMNS: readonly { key: SortableColumn; label: string; width: number }[] = [
  { key: 'mv', label: '市值', width: MV_WIDTH },
  { key: 'ret', label: '報酬%', width: 96 },
  { key: 'unreal', label: '未實現', width: 104 },
  { key: 'today', label: '今日漲跌%', width: 96 },
  { key: 'price', label: '現價', width: 96 },
  { key: 'qty', label: '股數', width: 76 },
  { key: 'avg', label: '均價', width: 96 },
  { key: 'cost', label: '成本', width: 104 },
  { key: 'weight', label: '佔比', width: 64 },
  { key: 'xirr', label: '年化', width: 96 },
];
const TOTAL_WIDTH = COLUMNS.reduce((sum, c) => sum + c.width, 0);

const TONE_STYLE: Record<CellTone, TextStyle> = {
  strong: { color: colors.textPrimary, fontFamily: fontFamily.num.bold },
  up: { color: colors.up, fontFamily: fontFamily.num.bold },
  down: { color: colors.down, fontFamily: fontFamily.num.bold },
  flat: { color: colors.textSecondary, fontFamily: fontFamily.num.bold },
  muted: { color: colors.textSecondary, fontFamily: fontFamily.num.semibold },
  faint: { color: colors.textFaint, fontFamily: fontFamily.num.semibold },
};

export interface HoldingsTableProps {
  sections: readonly TableSection[];
  sort: HoldingsSort;
  onSort: (key: HoldingsSortKey) => void;
  onPressRow: (row: HoldingTableRow) => void;
}

export function HoldingsTable({ sections, sort, onSort, onPressRow }: HoldingsTableProps) {
  // Shared pressed state so both halves of a row highlight together.
  const [pressedKey, setPressedKey] = useState<string | null>(null);

  const arrow = (key: HoldingsSortKey) =>
    sort.key === key ? <Text style={styles.arrow}>{sort.dir === 'desc' ? ' ▼' : ' ▲'}</Text> : null;

  const rowPressProps = (row: HoldingTableRow) => ({
    accessibilityRole: 'button' as const,
    onPress: () => onPressRow(row),
    onPressIn: () => setPressedKey(row.key),
    onPressOut: () => setPressedKey(null),
  });

  return (
    <View style={styles.table}>
      {/* Frozen symbol column */}
      <View style={styles.frozen}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="依代號排序"
          onPress={() => onSort('symbol')}
          style={[styles.headerCell, styles.frozenCell]}
        >
          <Text style={[styles.headerText, sort.key === 'symbol' ? styles.headerActive : null]}>
            代號
            {arrow('symbol')}
          </Text>
        </Pressable>
        {sections.map((section) => (
          <View key={section.key}>
            {section.label !== null ? (
              <View style={[styles.groupCell, styles.groupBg, styles.frozenCell]}>
                <Text style={styles.groupLabel} numberOfLines={1}>
                  {section.label}
                </Text>
              </View>
            ) : null}
            {section.rows.map((row) => (
              <Pressable
                key={row.key}
                {...rowPressProps(row)}
                style={[
                  styles.rowCell,
                  styles.frozenCell,
                  pressedKey === row.key ? styles.pressed : null,
                ]}
              >
                <Text style={styles.symbol} numberOfLines={1}>
                  {row.symbol}
                </Text>
              </Pressable>
            ))}
          </View>
        ))}
      </View>

      {/* Scrolling columns: header, group rows and data rows move together */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        directionalLockEnabled
        style={styles.scroll}
      >
        <View>
          <View style={styles.line}>
            {COLUMNS.map((c) => (
              <Pressable
                key={c.key}
                accessibilityRole="button"
                accessibilityLabel={`依${c.label}排序`}
                onPress={() => onSort(c.key)}
                style={[styles.headerCell, styles.numCell, { width: c.width }]}
              >
                <Text style={[styles.headerText, sort.key === c.key ? styles.headerActive : null]}>
                  {c.label}
                  {arrow(c.key)}
                </Text>
              </Pressable>
            ))}
          </View>
          {sections.map((section) => (
            <View key={section.key}>
              {section.label !== null ? (
                <View style={[styles.line, styles.groupLine, { width: TOTAL_WIDTH }]}>
                  <View style={[styles.groupCell, styles.numCell, { width: MV_WIDTH }]}>
                    <Text style={styles.groupSubtotal} numberOfLines={1}>
                      {section.subtotalText}
                    </Text>
                  </View>
                  <View style={[styles.groupCell, styles.groupCount]}>
                    <Text style={styles.groupCountText} numberOfLines={1}>
                      {section.count} 檔
                      {section.skippedCount > 0 ? ` · ${section.skippedCount} 檔資料異常` : ''}
                    </Text>
                  </View>
                </View>
              ) : null}
              {section.rows.map((row) => (
                <Pressable
                  key={row.key}
                  {...rowPressProps(row)}
                  style={[styles.line, pressedKey === row.key ? styles.pressed : null]}
                >
                  {COLUMNS.map((c) => {
                    const cell = row.cells[c.key];
                    return (
                      <View
                        key={c.key}
                        style={[styles.rowCell, styles.numCell, { width: c.width }]}
                      >
                        <Text
                          style={[styles.value, TONE_STYLE[cell.tone]]}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.7}
                        >
                          {cell.text}
                          {c.key === 'xirr' && row.xirrCumulative ? (
                            <Text style={styles.mark}>*</Text>
                          ) : null}
                        </Text>
                      </View>
                    );
                  })}
                </Pressable>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  table: { flexDirection: 'row', marginTop: 12 },
  frozen: { width: FROZEN_WIDTH, backgroundColor: colors.screen, zIndex: 1 },
  frozenCell: { width: FROZEN_WIDTH, alignItems: 'flex-start', paddingLeft: 2 },
  scroll: { flex: 1 },
  line: { flexDirection: 'row' },
  headerCell: { height: HEADER_HEIGHT, justifyContent: 'center' },
  headerText: {
    fontFamily: fontFamily.text.medium,
    fontSize: 11.5,
    color: colors.textWeak,
  },
  headerActive: { color: colors.textPrimary },
  arrow: { fontSize: 9, color: colors.accent },
  numCell: { alignItems: 'flex-end', paddingHorizontal: 10 },
  groupLine: { backgroundColor: 'rgba(255,255,255,0.025)' },
  groupCell: { height: GROUP_HEIGHT, justifyContent: 'center' },
  groupBg: { backgroundColor: 'rgba(255,255,255,0.025)' },
  groupLabel: {
    fontFamily: fontFamily.text.bold,
    fontSize: 12.5,
    color: colors.textPrimary,
    paddingRight: 4,
  },
  groupSubtotal: {
    ...numericStyle,
    fontFamily: fontFamily.num.bold,
    fontSize: 12,
    color: colors.textSecondary,
  },
  groupCount: { paddingHorizontal: 10 },
  groupCountText: { fontFamily: fontFamily.text.medium, fontSize: 12, color: colors.textWeak },
  rowCell: { height: ROW_HEIGHT, justifyContent: 'center' },
  symbol: { fontFamily: fontFamily.num.extrabold, fontSize: 15, color: colors.textPrimary },
  value: { ...numericStyle, fontSize: 14 },
  mark: { color: colors.textFaint, fontSize: 11 },
  pressed: { opacity: 0.6 },
});
