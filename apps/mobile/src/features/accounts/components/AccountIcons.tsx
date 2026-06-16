import Svg, { Path } from 'react-native-svg';
import { colors } from '../../../core/theme';

/**
 * 帳戶功能本地圖示 —— core/ui/Icon 尚未提供 edit / trash（規則：缺 icon 走 feature 本地 inline svg，
 * 不動 core/ui/Icon.tsx）。沿用 Icon 的 21×21 viewBox + 1.8 stroke 輪廓風格，視覺一致。
 */

const VIEW_BOX = '0 0 21 21';

interface InlineIconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

const outline = (color: string, strokeWidth: number) =>
  ({
    fill: 'none' as const,
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }) as const;

/** 鉛筆（編輯）。 */
export function EditIcon({
  size = 20,
  color = colors.textSecondary,
  strokeWidth = 1.8,
}: InlineIconProps) {
  return (
    <Svg width={size} height={size} viewBox={VIEW_BOX}>
      <Path
        {...outline(color, strokeWidth)}
        d="M13.2 4.3l3.5 3.5M4 17l1-3.6 8.2-8.2 3.5 3.5L8.6 16 4 17z"
      />
    </Svg>
  );
}

/** 垃圾桶（刪除）。 */
export function TrashIcon({ size = 20, color = colors.down, strokeWidth = 1.8 }: InlineIconProps) {
  return (
    <Svg width={size} height={size} viewBox={VIEW_BOX}>
      <Path
        {...outline(color, strokeWidth)}
        d="M4 6h13M8.5 6V4.5h4V6M6 6l.8 10.5h7.4L15 6M9 9v5M12 9v5"
      />
    </Svg>
  );
}

/** 加號（無持股空狀態 icon 用）。 */
export function PlusIcon({ size = 26, color = colors.accent, strokeWidth = 1.8 }: InlineIconProps) {
  return (
    <Svg width={size} height={size} viewBox={VIEW_BOX}>
      <Path {...outline(color, strokeWidth + 0.4)} d="M10.5 4.5v12M4.5 10.5h12" />
    </Svg>
  );
}
