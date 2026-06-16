import { Fragment } from 'react';
import type { ReactNode } from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from '../theme';

/**
 * Icon —— 應用程式線性圖示集（design.md app-prototype `Icon`/`AuIcon`/`AnalysisPieIcon`）。
 *
 * react-native-svg 自繪，path 幾何忠實移植自 web prototype（aa-core.jsx:224、
 * aa-analysis-page.jsx:7 圓餅 tab、aa-auth.jsx:70 表單圖示），統一 **21×21 viewBox**。
 * 輪廓風格：fill none、stroke 跟隨 `color`、round cap/join，預設線寬 1.8。
 *
 * 少數圖示沿用 prototype 的相對線寬微調（back/plus/check 稍粗、more 為實心點），
 * 透過 `STROKE_SCALE` / 實心 path 在定義時內建，呼叫端只需給 `name`。
 *
 * 依賴方向：core/ui → core/theme（預設色取 textPrimary）。純展示、無狀態。
 */

/** 24×24 設計慣例改採 prototype 的 21×21 viewBox，全 icon 共用。 */
const VIEW_BOX = '0 0 21 21';

/** 可用圖示名（typed union；新增 icon 時擴充此聯集 + ICONS 表）。 */
export type IconName =
  // —— 底部 tab（持倉 / 交易 / 分析[圓餅] / 設定[齒輪]）——
  | 'holdings'
  | 'txn'
  | 'analysis'
  | 'settings'
  // —— 帳戶（v1 nav，帳戶頁仍用）——
  | 'accounts'
  // —— 導航 / 動作 ——
  | 'back'
  | 'chevron'
  | 'more'
  | 'bell'
  | 'plus'
  | 'refresh'
  | 'calendar'
  | 'check'
  | 'alert'
  // —— 表單欄位 ——
  | 'mail'
  | 'lock'
  | 'eye'
  | 'eyeOff';

interface IconProps {
  /** 圖示名（typed union）。 */
  name: IconName;
  /** 邊長（px），對應 svg width/height。預設 24。 */
  size?: number;
  /** 描邊色。預設 textPrimary（tab/動作呼叫端常傳入 accent / textFaint）。 */
  color?: string;
  /** 基礎線寬。預設 1.8（design 1.8-stroke 輪廓風格）。 */
  strokeWidth?: number;
}

/**
 * 各圖示的 path 工廠：吃 (color, strokeWidth) 回傳 svg 子節點。
 * 共用描邊屬性以 `outline()` 產生；實心點（more）走 `fill`。
 *
 * 部分圖示沿用 prototype 的相對線寬：back +0.2、plus +0.4、check +0.2（相對基礎 1.8）。
 */
const ICONS: Record<IconName, (color: string, sw: number) => ReactNode> = {
  holdings: (c, sw) => (
    <Fragment>
      <Path {...outline(c, sw)} d="M3 14l4-4 4 3 6-7" />
      <Path {...outline(c, sw)} d="M15 6h3v3" />
    </Fragment>
  ),
  txn: (c, sw) => (
    <Fragment>
      <Rect {...outline(c, sw)} x="3" y="4" width="15" height="13" rx="2.4" />
      <Path {...outline(c, sw)} d="M6 9h9M6 12.5h6" />
    </Fragment>
  ),
  analysis: (c, sw) => (
    <Fragment>
      <Circle {...outline(c, sw)} cx="10.5" cy="10.5" r="7.6" />
      <Path {...outline(c, sw)} d="M10.5 10.5V2.9M10.5 10.5l6.6 3.9" />
    </Fragment>
  ),
  settings: (c, sw) => (
    <Fragment>
      <Circle {...outline(c, sw)} cx="10.5" cy="10.5" r="3" />
      <Path
        {...outline(c, sw)}
        d="M10.5 2.4v2.2M10.5 16.4v2.2M2.4 10.5h2.2M16.4 10.5h2.2M4.8 4.8l1.5 1.5M14.7 14.7l1.5 1.5M16.2 4.8l-1.5 1.5M5.3 14.7l1.5 1.5"
      />
    </Fragment>
  ),
  accounts: (c, sw) => (
    <Fragment>
      <Path {...outline(c, sw)} d="M3 8.5l7.5-4.2 7.5 4.2M4.5 8.5V16h12V8.5" />
      <Path {...outline(c, sw)} d="M8.5 16v-3.4h4V16" />
    </Fragment>
  ),
  back: (c, sw) => <Path {...outline(c, sw + 0.2)} d="M13 5l-6 6 6 6" />,
  chevron: (c, sw) => <Path {...outline(c, sw)} d="M8 5l5 5.5-5 5.5" />,
  more: (c) => (
    <Fragment>
      <Circle fill={c} cx="5" cy="11" r="1.5" />
      <Circle fill={c} cx="11" cy="11" r="1.5" />
      <Circle fill={c} cx="17" cy="11" r="1.5" />
    </Fragment>
  ),
  bell: (c, sw) => (
    <Fragment>
      <Path {...outline(c, sw)} d="M6 9a5 5 0 0110 0c0 5 2 6 2 6H4s2-1 2-6z" />
      <Path {...outline(c, sw)} d="M9 18a2 2 0 004 0" />
    </Fragment>
  ),
  plus: (c, sw) => <Path {...outline(c, sw + 0.4)} d="M11 5v12M5 11h12" />,
  refresh: (c, sw) => (
    <Fragment>
      <Path {...outline(c, sw)} d="M16 6a6 6 0 10.9 7" />
      <Path {...outline(c, sw)} d="M16 2.5V6h-3.5" />
    </Fragment>
  ),
  calendar: (c, sw) => (
    <Fragment>
      <Rect {...outline(c, sw)} x="3" y="5" width="15" height="13" rx="2.4" />
      <Path {...outline(c, sw)} d="M3 9h15M7 3v3M14 3v3" />
    </Fragment>
  ),
  check: (c, sw) => <Path {...outline(c, sw + 0.2)} d="M5 11l3.5 3.5L16 6" />,
  alert: (c, sw) => (
    <Fragment>
      <Circle {...outline(c, sw)} cx="10.5" cy="10.5" r="7.5" />
      <Path {...outline(c, sw)} d="M10.5 7V11" />
      <Circle fill={c} cx="10.5" cy="13.8" r="0.4" />
    </Fragment>
  ),
  mail: (c, sw) => (
    <Fragment>
      <Rect {...outline(c, sw)} x="2.5" y="4.5" width="16" height="12" rx="2.4" />
      <Path {...outline(c, sw)} d="M3.5 6.5L10.5 11.5L17.5 6.5" />
    </Fragment>
  ),
  lock: (c, sw) => (
    <Fragment>
      <Rect {...outline(c, sw)} x="4" y="9" width="13" height="9" rx="2.2" />
      <Path {...outline(c, sw)} d="M7 9V7a3.5 3.5 0 017 0V9" />
    </Fragment>
  ),
  eye: (c, sw) => (
    <Fragment>
      <Path
        {...outline(c, sw)}
        d="M2.5 10.5C4.5 6.8 7.3 5 10.5 5C13.7 5 16.5 6.8 18.5 10.5C16.5 14.2 13.7 16 10.5 16C7.3 16 4.5 14.2 2.5 10.5Z"
      />
      <Circle {...outline(c, sw)} cx="10.5" cy="10.5" r="2.6" />
    </Fragment>
  ),
  eyeOff: (c, sw) => (
    <Fragment>
      <Path {...outline(c, sw)} d="M3 3L18 18" />
      <Path
        {...outline(c, sw)}
        d="M7.5 5.8C8.4 5.3 9.4 5 10.5 5C13.7 5 16.5 6.8 18.5 10.5C17.9 11.6 17.2 12.5 16.4 13.2M13.5 13.9C12.6 14.6 11.6 15 10.5 16C7.3 16 4.5 14.2 2.5 10.5C3.3 9 4.3 7.9 5.4 7.1"
      />
    </Fragment>
  ),
};

/** 共用輪廓描邊屬性（fill none、round cap/join）。 */
function outline(color: string, strokeWidth: number) {
  return {
    fill: 'none' as const,
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
}

export default function Icon({
  name,
  size = 24,
  color = colors.textPrimary,
  strokeWidth = 1.8,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox={VIEW_BOX}>
      {ICONS[name](color, strokeWidth)}
    </Svg>
  );
}
