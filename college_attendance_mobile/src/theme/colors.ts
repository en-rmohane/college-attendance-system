// High-end Commercial EdTech & SaaS Pastel Design System

export const lightColors = {
  // Main background tokens (Never pure white)
  background: '#F6F8FC',
  backgroundSecondary: '#EEF2F8',
  card: '#FFFFFF',
  surfaceSubtle: '#F0F4FA',
  headerBg: '#F6F8FC',
  navBg: '#FFFFFF',
  tabBarBg: '#FFFFFF',

  // Primary Indigo Brand
  primary: '#5B6CFF',
  primaryDark: '#4453E8',
  primarySubtle: '#EAF0FF',
  softBlue: '#EAF0FF',

  // Soft Pastel Spectrum
  purple: '#8B7CF6',
  softLavender: '#EEE9FF',
  teal: '#42B8B5',
  softCyan: '#DDF7F8',
  green: '#45B97C',
  softGreen: '#E3F7EC',
  amber: '#E8A83E',
  softYellow: '#FFF4D6',
  coral: '#F28B75',
  softPeach: '#FFE8DF',
  pink: '#D86B9B',
  softPink: '#FCE7F3',

  // Legacy & Semantic compatibility
  accent: '#42B8B5',
  accentSubtle: '#DDF7F8',
  success: '#45B97C',
  successSubtle: '#E3F7EC',
  warning: '#E8A83E',
  warningSubtle: '#FFF4D6',
  danger: '#F28B75',
  dangerSubtle: '#FFE8DF',
  info: '#5B6CFF',
  infoSubtle: '#EAF0FF',

  // Typography Tokens
  text: '#172033',
  textSecondary: '#697386',
  textMuted: '#94A3B8',
  textLight: '#FFFFFF',

  // Structural & Glass Tokens
  border: '#E2E7F0',
  borderLight: '#EDF2F7',
  divider: '#EEF2F6',
  shadow: 'rgba(23, 32, 51, 0.06)',
  shadowMedium: 'rgba(23, 32, 51, 0.10)',
  glassCard: 'rgba(255, 255, 255, 0.85)',
  glassBorder: 'rgba(255, 255, 255, 0.60)',
  ripple: 'rgba(91, 108, 255, 0.12)',
};

export const darkColors = {
  background: '#0F172A',
  backgroundSecondary: '#1E293B',
  card: '#1E293B',
  surfaceSubtle: '#334155',
  headerBg: '#0F172A',
  navBg: '#1E293B',
  tabBarBg: '#1E293B',

  // Primary Brand in Dark Mode
  primary: '#7B88FF',
  primaryDark: '#5B6CFF',
  primarySubtle: 'rgba(91, 108, 255, 0.20)',
  softBlue: 'rgba(91, 108, 255, 0.18)',

  // Soft Pastel Spectrum adjusted for Dark Mode
  purple: '#A78BFA',
  softLavender: 'rgba(139, 124, 246, 0.18)',
  teal: '#5EEAD4',
  softCyan: 'rgba(66, 184, 181, 0.18)',
  green: '#6EE7B7',
  softGreen: 'rgba(69, 185, 124, 0.18)',
  amber: '#FCD34D',
  softYellow: 'rgba(232, 168, 62, 0.18)',
  coral: '#FDA4AF',
  softPeach: 'rgba(242, 139, 117, 0.18)',
  pink: '#F472B6',
  softPink: 'rgba(216, 107, 155, 0.18)',

  // Legacy & Semantic compatibility
  accent: '#5EEAD4',
  accentSubtle: 'rgba(66, 184, 181, 0.18)',
  success: '#34D399',
  successSubtle: 'rgba(52, 211, 153, 0.18)',
  warning: '#FBBF24',
  warningSubtle: 'rgba(251, 191, 36, 0.18)',
  danger: '#FB7185',
  dangerSubtle: 'rgba(251, 113, 133, 0.18)',
  info: '#60A5FA',
  infoSubtle: 'rgba(96, 165, 250, 0.18)',

  // Typography Tokens
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textLight: '#FFFFFF',

  // Structural & Glass Tokens
  border: '#334155',
  borderLight: '#1E293B',
  divider: '#334155',
  shadow: 'rgba(0, 0, 0, 0.35)',
  shadowMedium: 'rgba(0, 0, 0, 0.50)',
  glassCard: 'rgba(30, 41, 59, 0.85)',
  glassBorder: 'rgba(255, 255, 255, 0.10)',
  ripple: 'rgba(123, 136, 255, 0.20)',
};

export const Colors = {
  light: lightColors,
  dark: darkColors,
};

export type ThemeType = 'light' | 'dark';
export type ThemeColors = typeof lightColors;
