import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily, fontSize, gradientDirection, radius, spacing } from '../theme';

/**
 * Segmented —— 通用分段控制（aa-core.jsx:177）。
 * 用於 持股/帳戶/類別、TWD/USD、買/賣。選中段為 accent 漸層膠囊（160deg）+ 柔光。
 *
 * 泛型 `<T extends string>`：value 與 options[].value 同型，onChange 回傳該型別。
 * label 預設＝value（純字串選項，如 TWD/USD）；需中文標籤時帶 `label`。
 */
interface SegmentedOption<T extends string> {
  value: T;
  label?: string;
}

interface SegmentedProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export default function Segmented<T extends string>({
  options,
  value,
  onChange,
}: SegmentedProps<T>) {
  return (
    <View style={styles.track}>
      {options.map((o) => {
        const on = o.value === value;
        const label = o.label ?? o.value;
        if (on) {
          return (
            <LinearGradient
              key={o.value}
              colors={[colors.accent, `${colors.accent}cc`]}
              start={gradientDirection.diagonal160.start}
              end={gradientDirection.diagonal160.end}
              style={styles.segOn}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: true }}
                onPress={() => onChange(o.value)}
                style={styles.press}
              >
                <Text style={[styles.label, styles.labelOn]}>{label}</Text>
              </Pressable>
            </LinearGradient>
          );
        }
        return (
          <Pressable
            key={o.value}
            accessibilityRole="button"
            accessibilityState={{ selected: false }}
            onPress={() => onChange(o.value)}
            style={styles.seg}
          >
            <Text style={styles.label}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.xs,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.lg,
  },
  seg: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  segOn: {
    flex: 1,
    borderRadius: radius.md,
    shadowColor: colors.accent,
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  press: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: fontFamily.text.medium,
    fontSize: fontSize.footnote,
    color: colors.textWeak,
  },
  labelOn: { fontFamily: fontFamily.text.bold, color: colors.onPrimary },
});
