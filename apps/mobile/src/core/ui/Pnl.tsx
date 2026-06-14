import { StyleSheet, Text } from 'react-native';
import type { TextStyle } from 'react-native';
import { colors, fontFamily } from '../theme';

/**
 * Pnl —— 漲跌數字（aa-core.jsx:90 `Pnl` / `PnlAmt`）。
 * 正＝漲綠 + ▲；負＝跌紅 + ▼（色系 1 語意盈虧）。全部 tabular-nums。
 *
 * 純展示：`value` 只決定正負（→ 色 + 箭頭方向），實際顯示字串由 screens
 * 以 `Money` 預格式化後傳 `display`（含 `+7.66%` / `NT$ 88,200` 等；勿在此做金額運算）。
 *
 * - signMode `arrow`（預設）：▲ / ▼ 前綴。
 * - signMode `plusminus`：+ / − 前綴（百分比常用）。
 * - colorize=false：用次文字色（Tweaks 關損益色時）。
 */
interface PnlProps {
  /** 決定正負；>= 0 視為正（漲）。 */
  value: number;
  /** 預格式化的「絕對值」顯示字（screens 以 Money 算好，不含正負號）。 */
  display: string;
  signMode?: 'arrow' | 'plusminus';
  colorize?: boolean;
  size?: number;
  /** 字重（num 家族）。預設 bold。 */
  weight?: keyof typeof fontFamily.num;
}

export default function Pnl({
  value,
  display,
  signMode = 'arrow',
  colorize = true,
  size = 13,
  weight = 'bold',
}: PnlProps) {
  const up = value >= 0;
  const color = colorize ? (up ? colors.up : colors.down) : colors.textSecondary;
  const sign = signMode === 'arrow' ? (up ? '▲ ' : '▼ ') : up ? '+' : '−';

  const dynamic: TextStyle = {
    color,
    fontSize: size,
    fontFamily: fontFamily.num[weight],
  };

  return (
    <Text style={[styles.text, dynamic]} numberOfLines={1}>
      {sign}
      {display}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: { fontVariant: ['tabular-nums'] },
});
