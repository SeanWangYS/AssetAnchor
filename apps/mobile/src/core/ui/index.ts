// core/ui —— 展示型元件庫（align-to-design-package design.md §4）。
// 只消費 core/theme + @assetanchor/shared；不 import features / services。
// 匯入慣例對齊 mobile（moduleResolution: Bundler，相對匯入不帶副檔名）。

// —— 基礎（既有，已 retrofit）——
export { default as Button } from './Button';
export { default as Input } from './Input';
export { default as Sheet } from './Sheet';
export { ListItem } from './List';

// —— 版面 / 容器 ——
export { default as Card } from './Card';

// —— 控制元件 ——
export { default as Segmented } from './Segmented';
export { default as TimeTabs } from './TimeTabs';
export { default as ColorSwatches } from './ColorSwatches';

// —— 顯示元件 ——
export { default as Avatar } from './Avatar';
export { default as Pnl } from './Pnl';
export { default as CashBalanceCard } from './CashBalanceCard';

// —— 圖示（react-native-svg 線性圖示集）——
export { default as Icon } from './Icon';
export type { IconName } from './Icon';

// —— 覆蓋 / 浮層 ——
export { default as Fab } from './Fab';
export { default as ConfirmDialog } from './ConfirmDialog';
export { default as EmptyState } from './EmptyState';
export { default as Toast } from './Toast';

// —— 品牌（圓環錨點）——
export { default as AALogoMark } from './AALogoMark';
export { default as AAWordmark } from './AAWordmark';
export { default as AABrandLockup } from './AABrandLockup';

// —— 圖表（react-native-svg / RN View 自繪）——
export * from './charts/index';
