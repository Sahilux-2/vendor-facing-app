import { Platform, TextStyle, ViewStyle } from 'react-native';

/** Every spacing, size, and radius value is a multiple of 4. */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  giant: 48,
} as const;

export const radius = { md: 12, lg: 16, xl: 20, pill: 48 } as const;

export const colors = {
  bg: '#FFFFFF',
  text: '#101828',
  textMuted: '#667085',
  divider: '#EAECF0',
  accent: '#0B7A43',
  accentSoft: '#0B7A43',
  danger: '#B42318',
  warning: '#B54708',
  white: '#FFFFFF',
  disabled: '#D0D5DD',
} as const;

/** Only two weights are used across the app. */
export const fonts = {
  medium: 'SFProRounded-Medium',
  bold: 'SFProRounded-Bold',
} as const;

export type Variant = 'display' | 'h1' | 'title' | 'body' | 'bodyBold' | 'caption' | 'captionBold';

export const typography: Record<Variant, TextStyle> = {
  display: { fontFamily: fonts.bold, fontSize: 40, lineHeight: 48 },
  h1: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 32 },
  title: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 28 },
  bodyBold: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 24 },
  body: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 24 },
  captionBold: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 16 },
  caption: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 },
};

/** Subtle drop shadow, the only elevation treatment used. */
export const shadow: ViewStyle = Platform.select<ViewStyle>({
  android: { elevation: 2, shadowColor: '#101828' },
  default: {
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
})!;
