import { useColorScheme } from 'react-native';

export const palette = {
  primary: '#f47920',
  secondary: '#1F1F25',
  heading: '#2c2c2c',
  body: '#6E777D',
  white: '#ffffff',
  danger: '#DC2626',
  info: '#1BA2DB',
  border: '#E5E7EB',
  muted: '#F3F4F6',
  success: '#10B981',
};

const tintColorLight = palette.primary;
const tintColorDark = palette.primary;

export const Colors = {
  light: {
    text: palette.heading,
    body: palette.body,
    background: '#ffffff',
    tint: tintColorLight,
    icon: palette.body,
    tabIconDefault: palette.body,
    tabIconSelected: tintColorLight,
    primary: palette.primary,
    secondary: palette.secondary,
    danger: palette.danger,
    info: palette.info,
    success: palette.success,
    border: palette.border,
    card: '#ffffff',
    muted: palette.muted,
    mutedForeground: '#9CA3AF',
    white: '#ffffff',
    foreground: palette.heading,
    primaryForeground: '#ffffff',
    radius: 6,
  },
  dark: {
    text: '#ffffff',
    body: '#D1D5DB',
    background: '#121212',
    tint: tintColorDark,
    icon: '#9CA3AF',
    tabIconDefault: '#9CA3AF',
    tabIconSelected: tintColorDark,
    primary: palette.primary,
    secondary: palette.secondary,
    danger: palette.danger,
    info: palette.info,
    success: palette.success,
    border: '#374151',
    card: '#1e1e1e',
    muted: '#374151',
    mutedForeground: '#9CA3AF',
    white: '#ffffff',
    foreground: '#ffffff',
    primaryForeground: '#ffffff',
    radius: 6,
  },
};

export function useColors() {
  const theme = useColorScheme() ?? 'light';
  return Colors[theme === 'dark' ? 'dark' : 'light'];
}
