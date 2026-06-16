import { Pressable, StyleSheet, View } from 'react-native';
import { ACCOUNT_COLORS, colors, radius, spacing } from '../theme';

/**
 * ColorSwatches —— 帳戶識別色選擇器（design.md §4「色票 ×6」）。
 * 預設色票來自 theme `ACCOUNT_COLORS`；選中色加白環 + 柔光。受控 value/onChange。
 */
interface ColorSwatchesProps {
  value: string;
  onChange: (color: string) => void;
  /** 覆寫色票來源（預設 theme.ACCOUNT_COLORS）。 */
  options?: readonly string[];
  size?: number;
}

export default function ColorSwatches({
  value,
  onChange,
  options = ACCOUNT_COLORS,
  size = 32,
}: ColorSwatchesProps) {
  return (
    <View style={styles.row}>
      {options.map((c) => {
        const on = c === value;
        return (
          <Pressable
            key={c}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(c)}
            style={[
              styles.ring,
              { width: size + 8, height: size + 8, borderRadius: radius.round },
              on ? styles.ringOn : null,
            ]}
          >
            <View
              style={[
                styles.swatch,
                { width: size, height: size, borderRadius: radius.round, backgroundColor: c },
                on ? { shadowColor: c } : null,
              ]}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  ring: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  ringOn: { borderColor: colors.onPrimary },
  swatch: {
    shadowOpacity: 0.6,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
});
