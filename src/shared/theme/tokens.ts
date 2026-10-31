/**
 * Canonical design tokens extracted from Figma node 64:634
 * (Customer App / Auth / Đăng nhập / 390, fileKey OCkWSOZQ8Pq8AejXccajpO).
 */
export const colors = {
  background: '#FFFFFF',
  surface: '#FFFFFF',
  textPrimary: '#0B1F3A',
  textSecondary: '#6C7D98',
  textLabel: '#4E5C70',
  textMuted: '#53647D',
  textDivider: '#7A8799',
  brandPrimary: '#2C6BED',
  ctaPrimaryBg: '#050608',
  ctaPrimaryText: '#FFFFFF',
  guestButtonBg: '#F1F5FB',
  guestButtonText: '#2C6BED',
  borderSocial: '#D3DCE9',
  borderDivider: '#DCE3EC',
  borderInput: '#8793A3',
  borderCheckbox: '#AFC1D9',
  danger: '#D92D20',
  success: '#079455',
  warning: '#DC6803',
} as const;

export const typography = {
  fontFamily: {
    regular: 'Be Vietnam Pro',
    medium: 'Be Vietnam Pro Medium',
    semiBold: 'Be Vietnam Pro SemiBold',
    bold: 'Be Vietnam Pro Bold',
  },
  fontSize: {
    caption: 8.5,
    divider: 9,
    footnote: 10,
    bodySmall: 11,
    body: 12,
    subtitle: 15,
    title: 23,
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 28,
} as const;

export const radii = {
  checkbox: 5,
  input: 13,
  guestButton: 14,
  socialButton: 15,
  ctaPrimary: 16,
} as const;

export const viewport = {
  canonicalWidth: 390,
  canonicalHeight: 844,
  responsiveWidths: [320, 360, 390, 412, 480] as const,
  fontScales: [1, 1.3, 2] as const,
} as const;
