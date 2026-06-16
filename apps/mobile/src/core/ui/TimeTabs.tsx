import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily, fontSize, radius, spacing } from '../theme';

/**
 * TimeTabs —— 時間區間膠囊（aa-core.jsx:195）。
 * 選中＝白底深字膠囊；其餘＝透明弱字。items 可配置：
 * 持倉總覽 `['1M','3M','YTD','1Y','ALL']`、AssetDetail `['1D','1W','1M','3M','1Y','ALL']`。
 *
 * 泛型 `<T extends string>`：value / items / onChange 同型。
 */
interface TimeTabsProps<T extends string> {
  items: readonly T[];
  value: T;
  onChange: (value: T) => void;
}

export default function TimeTabs<T extends string>({ items, value, onChange }: TimeTabsProps<T>) {
  return (
    <View style={styles.row}>
      {items.map((t) => {
        const on = t === value;
        return (
          <Pressable
            key={t}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(t)}
            style={[styles.pill, on ? styles.pillOn : null]}
          >
            <Text style={[styles.label, on ? styles.labelOn : null]}>{t}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pill: {
    paddingVertical: spacing.xs + 1,
    paddingHorizontal: spacing.sm - 1,
    borderRadius: radius.pill,
  },
  pillOn: {
    backgroundColor: colors.onPrimary,
    paddingHorizontal: spacing.md,
  },
  label: {
    fontFamily: fontFamily.num.semibold,
    fontSize: fontSize.label,
    color: colors.textWeak,
    fontVariant: ['tabular-nums'],
  },
  labelOn: { fontFamily: fontFamily.num.extrabold, color: '#111111' },
});
