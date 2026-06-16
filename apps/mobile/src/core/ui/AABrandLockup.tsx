import { StyleSheet, View } from 'react-native';
import { spacing } from '../theme';
import AALogoMark from './AALogoMark';
import AAWordmark from './AAWordmark';

/**
 * AABrandLockup —— 標誌 + 字標橫向鎖定（aa-auth.jsx:60）。設定頁 / 關於頁共用。
 */
interface AABrandLockupProps {
  markSize?: number;
  wordSize?: number;
  glow?: boolean;
}

export default function AABrandLockup({
  markSize = 30,
  wordSize = 17,
  glow = false,
}: AABrandLockupProps) {
  return (
    <View style={styles.row}>
      <AALogoMark size={markSize} glow={glow} />
      <AAWordmark size={wordSize} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2 },
});
