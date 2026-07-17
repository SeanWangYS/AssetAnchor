import { StyleSheet, Text } from 'react-native';
import type { TextStyle } from 'react-native';
import { signOf } from '@assetanchor/shared';
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
 * - **零值中性**（visual-audit P2-4）：value 為 0、或 `display` 捨入後不含任何非零數字
 *   （如 TWD 0 位下的 0.4 → 「NT$ 0」）→ 次文字色、無箭頭無正負號。
 */

/** 顯示字串是否為「捨入後的零」：含數字且全為 0（「NT$ 0」「0.00%」true；「—」無數字也視為中性）。 */
function isDisplayZero(display: string): boolean {
  return !/[1-9]/.test(display);
}
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
  /**
   * opt-in autofit（visual-audit P2-1：關鍵大數不得截斷）——溢出時縮字完整顯示。
   * 預設 false：列表 row 全域開會靜默縮字、視覺不穩，只給 hero/bento 場景。
   */
  fit?: boolean;
}

export default function Pnl({
  value,
  display,
  signMode = 'arrow',
  colorize = true,
  size = 13,
  weight = 'bold',
  fit = false,
}: PnlProps) {
  const dir = isDisplayZero(display) ? 'flat' : signOf(value);
  const color =
    colorize && dir !== 'flat' ? (dir === 'up' ? colors.up : colors.down) : colors.textSecondary;
  const sign =
    dir === 'flat'
      ? ''
      : signMode === 'arrow'
        ? dir === 'up'
          ? '▲ '
          : '▼ '
        : dir === 'up'
          ? '+'
          : '−';

  const dynamic: TextStyle = {
    color,
    fontSize: size,
    fontFamily: fontFamily.num[weight],
  };

  return (
    <Text
      style={[styles.text, dynamic]}
      numberOfLines={1}
      adjustsFontSizeToFit={fit}
      minimumFontScale={fit ? 0.5 : undefined}
    >
      {sign}
      {display}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: { fontVariant: ['tabular-nums'] },
});
