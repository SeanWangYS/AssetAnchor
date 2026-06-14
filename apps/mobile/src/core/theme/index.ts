/**
 * Dark-first 設計 tokens —— 單一事實來源（align-to-design-package `design.md` §3）。
 *
 * 設計包是產品最高權威（ADR-0008）；本檔把 §3 的精確 hex 編碼成 token，所有畫面只消費這裡的值。
 * reskin / Tweaks（accent 切換、關光暈）時只換這裡，不動使用 token 的元件。
 *
 * ⚠️ 向後相容：`colors` / `spacing` / `radius` / `fontSize` / `ACCOUNT_COLORS` 的「鍵」維持既有 shape，
 * 只把值改成 dark；新 token 群（gradients / fonts / fontWeight / 漲跌 / accent options / chart / sizing）為新增。
 * 既有畫面尚未 retrofit（那是 Phase 4），故不可刪鍵、不可改鍵型別。
 */

import type { TextStyle } from 'react-native';

/**
 * 顏色 token。
 * - 既有鍵（bg/surface/border/text/textMuted/primary/danger/onPrimary）保留，值改 dark：
 *   `bg`→畫面底、`surface`→卡面近似、`text`→主文字、`textMuted`→次文字、`primary`→accent、`danger`→跌/錯誤紅。
 * - 新增 §3 語意鍵（page/screen/textWeak/textFaint/divider/up/down/accent*）。
 */
export const colors = {
  // —— 既有鍵（保留，值改 dark）——
  /** 卡面近似底色（卡片實際用 gradients.cardSurface 疊在 screen 上）。 */
  surface: 'rgba(255,255,255,0.04)',
  /** 畫面底色（多數 Screen 容器背景）= §3 screen。 */
  bg: '#0E1117',
  /** 分隔線 / 卡邊。 */
  border: 'rgba(255,255,255,0.09)',
  /** 主文字。 */
  text: 'rgba(255,255,255,0.95)',
  /** 次文字（弱）。 */
  textMuted: 'rgba(255,255,255,0.62)',
  /** 強調色 = accent 預設。 */
  primary: '#7C6CF0',
  /** 破壞性 / 跌 / 驗證錯誤（§3：error 也用 #FF5E62）。 */
  danger: '#FF5E62',
  /** accent / 漸層上的文字。 */
  onPrimary: '#FFFFFF',

  // —— 新增：§3 底色 / 文字層級 / 線 ——
  /** 頁底（最外層 root 背景，比 screen 再深一階）。 */
  page: '#0A0C10',
  /** 畫面底（Screen 容器，頂部可疊極淡 accent 光暈）。 */
  screen: '#0E1117',
  /** 文字 — 主。 */
  textPrimary: 'rgba(255,255,255,0.95)',
  /** 文字 — 次。 */
  textSecondary: 'rgba(255,255,255,0.62)',
  /** 文字 — 弱。 */
  textWeak: 'rgba(255,255,255,0.42)',
  /** 文字 — 極弱（佔位 / disabled）。 */
  textFaint: 'rgba(255,255,255,0.26)',
  /** 分隔線 / 卡邊（同 border，語意命名）。 */
  divider: 'rgba(255,255,255,0.09)',

  // —— 新增：accent ——
  /** 強調色（預設）。 */
  accent: '#7C6CF0',

  // —— 新增：色系 1 漲跌（語意盈虧；▲▼ 數字、圖表正負）——
  /** 漲 / 正報酬。 */
  up: '#2FD37E',
  /** 跌 / 負報酬（= danger / error）。 */
  down: '#FF5E62',
  /** 驗證錯誤（語意別名，= down）。 */
  error: '#FF5E62',
} as const;

/**
 * Accent 可選色（設定 → 顯示偏好 Tweaks）。預設 `#7C6CF0`。
 * 順序對齊 §3 / `holdings-overview-spec.md:41`。
 */
export const ACCENT_OPTIONS = ['#4C6FE8', '#6C6CF0', '#7C6CF0', '#A368F0'] as const;

/**
 * 漸層 token —— 給 expo-linear-gradient（`colors` prop 吃 color-stop 陣列）。
 * 角度由各元件透過 `start`/`end` 設定（買/賣為 135deg、卡片為 160deg）。
 * 注意 §0 D3：買 紫→洋紅、賣 藍→青（prototype 的「買紅賣綠」token 為誤，以 spec 為準）。
 */
export const gradients = {
  /** 買入 linear-gradient(135deg) 紫→洋紅。交易列表「買」膠囊同此。 */
  buy: ['#7C5CE6', '#C24FD6'] as const,
  /** 賣出 linear-gradient(135deg) 藍→青。交易列表「賣」膠囊同此。 */
  sell: ['#2E74E6', '#35C6EA'] as const,
  /** 卡片表面 linear-gradient(160deg)，極淡白疊在 screen 上 + 1px 邊 + 柔外陰影。 */
  cardSurface: ['rgba(255,255,255,0.055)', 'rgba(255,255,255,0.022)'] as const,
} as const;

/**
 * 漸層方向預設（expo-linear-gradient start/end，0–1 座標）。
 * - diagonal135：左上→右下，對齊 CSS `135deg`（買/賣膠囊、代號圓標底）。
 * - diagonal160：近垂直略斜，對齊卡片 `160deg`。
 */
export const gradientDirection = {
  diagonal135: { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
  diagonal160: { start: { x: 0, y: 0 }, end: { x: 0.35, y: 1 } },
} as const;

/**
 * 圖表類別色（§3：個股 = accent、ETF = 青）。charts 用 react-native-svg 自繪（D5）。
 * key 對齊 `asset_type` enum（`@assetanchor/shared`）。
 */
export const chartCategory = {
  /** 個股 = accent。 */
  stock: '#7C6CF0',
  /** ETF = 青（= 賣漸層尾色）。 */
  etf: '#35C6EA',
} as const;

/** 8px 網格間距。既有鍵（xs/sm/md/lg/xl）保留；新增 page（頁面左右 padding）與細粒度。 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  /** 頁面左右 padding（§3）。 */
  page: 20,
  /** 卡片內距下界（§3：卡內 13–16）。 */
  cardInner: 13,
  /** 卡片內距上界。 */
  cardInnerLg: 16,
  /** 區塊間大間距（卡與卡）。 */
  xxl: 32,
} as const;

/**
 * 圓角 token。既有鍵（sm/md/lg）保留；新增 §3 大圓角群。
 * §3：手機畫面 42 / 卡片 16–18 / sheet 頂 26 / 圓鈕 50%（用 round）/ 膠囊 100。
 */
export const radius = {
  sm: 6,
  md: 8,
  lg: 12,
  /** 卡片下界。 */
  card: 16,
  /** 卡片上界（強調卡）。 */
  cardLg: 18,
  /** bottom sheet 頂部圓角。 */
  sheet: 26,
  /** 手機「畫面」外框圓角（prototype device frame）。 */
  screen: 42,
  /** 膠囊（Segmented / 買賣膠囊）。 */
  pill: 100,
  /** 全圓（圓鈕 / Avatar，用 9999 取代百分比）。 */
  round: 9999,
} as const;

/**
 * 字型家族。值＝@expo-google-fonts 載入後的 font-family 名（見 `fonts.ts` 的 fontMap key）。
 * - num：數字 / 拉丁 → Nunito（全部走 tabular-nums，以 `numericStyle` 套用）。
 * - text：中文 / UI 字串 → Noto Sans TC（純繁中、不做 i18n）。
 * 預設權重對齊內文（Nunito 700 數字較有 fintech 重量感、Noto 400 內文）。
 */
export const fonts = {
  num: 'Nunito_700Bold',
  text: 'NotoSansTC_400Regular',
} as const;

/**
 * 具名字重 → 實際 font-family（RN 不靠 fontWeight 切字重，須直接指定家族）。
 * Nunito 取 500–900、Noto Sans TC 取 400–800（§3）。
 */
export const fontFamily = {
  num: {
    medium: 'Nunito_500Medium',
    semibold: 'Nunito_600SemiBold',
    bold: 'Nunito_700Bold',
    extrabold: 'Nunito_800ExtraBold',
    black: 'Nunito_900Black',
  },
  text: {
    regular: 'NotoSansTC_400Regular',
    medium: 'NotoSansTC_500Medium',
    semibold: 'NotoSansTC_600SemiBold',
    bold: 'NotoSansTC_700Bold',
    extrabold: 'NotoSansTC_800ExtraBold',
  },
} as const;

/**
 * 字級 scale。既有鍵（caption/body/heading/title）保留；新增 §3 hero / 細粒度。
 * 對齊 prototype：hero 數字 38、卡片大標題 23、內文 ~15、label ~12。
 */
export const fontSize = {
  // —— 既有鍵（保留）——
  caption: 13,
  body: 16,
  heading: 20,
  title: 28,
  // —— 新增 ——
  /** 極弱 label / 膠囊 / 表頭。 */
  label: 12,
  /** 次要說明。 */
  footnote: 13,
  /** 內文預設（多數列表 / 表單）。 */
  text: 15,
  /** 卡片標題 / 區塊標。 */
  cardTitle: 23,
  /** Hero 數字（總資產 / 個股市值）。 */
  hero: 38,
} as const;

/**
 * tabular-nums 慣例（`.num`）：所有數字（金額 / 數量 / 報酬率 / 百分比）套用，
 * 確保等寬對齊。搭配 `fonts.num` 使用，e.g. `style={[numericStyle, { fontFamily: fonts.num }]}`。
 */
export const numericStyle: TextStyle = {
  fontVariant: ['tabular-nums'],
};

/** 帳戶識別色預設色票（保留 8 色；皆符合 #RRGGBB）。對齊 §4「色票 ×6」+ 既有預設不縮。 */
export const ACCOUNT_COLORS = [
  '#7C6CF0',
  '#4C6FE8',
  '#35C6EA',
  '#2FD37E',
  '#A368F0',
  '#C24FD6',
  '#FF5E62',
  '#F5A623',
] as const;

/** 彙整匯出，方便 `import { theme } from '@/core/theme'` 整包取用。 */
export const theme = {
  colors,
  spacing,
  radius,
  fontSize,
  fonts,
  fontFamily,
  gradients,
  gradientDirection,
  chartCategory,
  numericStyle,
  ACCENT_OPTIONS,
  ACCOUNT_COLORS,
} as const;

export type Theme = typeof theme;
