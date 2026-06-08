/**
 * 中性預設設計 tokens（Sprint 2 D8：結構先於配色，待設計定案再 reskin）。
 * reskin 時只換這裡的值，不動使用 token 的元件。
 */
export const colors = {
  bg: '#FFFFFF',
  surface: '#F2F2F7',
  border: '#D1D1D6',
  text: '#1C1C1E',
  textMuted: '#8E8E93',
  primary: '#0A84FF',
  danger: '#FF3B30',
  onPrimary: '#FFFFFF',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;

export const radius = { sm: 6, md: 8, lg: 12 } as const;

export const fontSize = { caption: 13, body: 16, heading: 20, title: 28 } as const;

/** 帳戶識別色預設色票（D9：預設色票而非全色盤；皆符合 #RRGGBB）。 */
export const ACCOUNT_COLORS = [
  '#0A84FF',
  '#30D158',
  '#FF9F0A',
  '#FF375F',
  '#BF5AF2',
  '#64D2FF',
  '#FFD60A',
  '#8E8E93',
] as const;
