import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, spacing } from '../theme';

interface ListItemProps {
  title: string;
  subtitle?: string;
  colorDot?: string;
  right?: ReactNode;
  onPress?: () => void;
  dimmed?: boolean;
}

export function ListItem({
  title,
  subtitle,
  colorDot,
  right,
  onPress,
  dimmed = false,
}: ListItemProps) {
  const content = (
    <View style={[styles.row, dimmed ? styles.dimmed : null]}>
      {colorDot ? <View style={[styles.dot, { backgroundColor: colorDot }]} /> : null}
      <View style={styles.texts}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
  return onPress ? (
    <Pressable accessibilityRole="button" onPress={onPress}>
      {content}
    </Pressable>
  ) : (
    content
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.bg,
  },
  dimmed: { opacity: 0.5 },
  dot: { width: 14, height: 14, borderRadius: 7 },
  texts: { flex: 1, gap: 2 },
  title: { fontSize: fontSize.body, color: colors.text },
  subtitle: { fontSize: fontSize.caption, color: colors.textMuted },
});
