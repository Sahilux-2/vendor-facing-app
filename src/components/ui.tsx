import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { AnimatePresence, MotiView } from 'moti';
import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleProp,
  Text,
  TextProps,
  TextStyle,
  View,
  ViewStyle,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconName } from '@/data/menu';
import { colors, radius, shadow, space, typography, Variant } from '@/theme';
import { useStore } from '@/store/store';

// ---------- Text ----------
interface AppTextProps extends TextProps {
  variant?: Variant;
  color?: string;
  style?: StyleProp<TextStyle>;
}

export function AppText({ variant = 'body', color = colors.text, style, ...rest }: AppTextProps) {
  return <Text {...rest} style={[typography[variant], { color }, style]} />;
}

// ---------- Press feedback ----------
interface TapProps {
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  haptic?: boolean;
  scale?: number;
}

export function Tap({ children, onPress, disabled, style, containerStyle, haptic = true, scale = 0.97 }: TapProps) {
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      disabled={disabled}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      onPress={() => {
        if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress?.();
      }}
      style={containerStyle}
    >
      <MotiView
        animate={{ scale: pressed ? scale : 1, opacity: pressed ? 0.92 : 1 }}
        transition={{ type: 'timing', duration: 120 }}
        style={style}
      >
        {children}
      </MotiView>
    </Pressable>
  );
}

// ---------- Entrance ----------
export function FadeIn({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <MotiView
      from={{ opacity: 0, translateY: 8 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 320, delay }}
      style={style}
    >
      {children}
    </MotiView>
  );
}

// ---------- Layout ----------
export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export const Divider = ({ style }: { style?: StyleProp<ViewStyle> }) => <View style={[styles.divider, style]} />;

export function Icon({ name, size = 24, color = colors.text }: { name: IconName; size?: number; color?: string }) {
  return <Ionicons name={name} size={size} color={color} />;
}

export function ScreenHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <FadeIn style={{ gap: space.xs }}>
      <AppText variant="h1">{title}</AppText>
      {subtitle ? (
        <AppText variant="body" color={colors.textMuted}>
          {subtitle}
        </AppText>
      ) : null}
    </FadeIn>
  );
}

export function useTopInset() {
  return useSafeAreaInsets().top + space.lg;
}

// ---------- Buttons ----------
type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const primary = variant === 'primary';
  const fg = disabled
    ? colors.textMuted
    : primary
      ? colors.white
      : variant === 'danger'
        ? colors.danger
        : variant === 'ghost'
          ? colors.textMuted
          : colors.accent;
  return (
    <Tap onPress={onPress} disabled={disabled} containerStyle={style}>
      <View
        style={[
          styles.button,
          primary && { backgroundColor: disabled ? colors.disabled : colors.accent },
          variant === 'secondary' && styles.buttonSecondary,
          variant === 'danger' && styles.buttonSecondary,
          variant === 'ghost' && { height: space.giant },
        ]}
      >
        {icon ? <Icon name={icon} size={24} color={fg} /> : null}
        <AppText variant="bodyBold" color={fg}>
          {label}
        </AppText>
      </View>
    </Tap>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: IconName;
}) {
  return (
    <Tap onPress={onPress}>
      <MotiView
        animate={{ borderColor: selected ? colors.accent : colors.divider }}
        transition={{ type: 'timing', duration: 200 }}
        style={styles.chip}
      >
        {icon ? <Icon name={icon} size={20} color={selected ? colors.accent : colors.textMuted} /> : null}
        <AppText variant="bodyBold" color={selected ? colors.accent : colors.text}>
          {label}
        </AppText>
      </MotiView>
    </Tap>
  );
}

export function Tag({ label, icon, color = colors.textMuted }: { label: string; icon?: IconName; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
      {icon ? <Icon name={icon} size={16} color={color} /> : null}
      <AppText variant="captionBold" color={color}>
        {label}
      </AppText>
    </View>
  );
}

// ---------- Stepper ----------
export function Stepper({
  value,
  onChange,
  min = 0.5,
  max = 20,
  step = 0.5,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  const round = (n: number) => Math.round(n * 2) / 2;
  return (
    <View style={styles.stepper}>
      <Tap onPress={() => onChange(round(Math.max(min, value - step)))} disabled={value <= min}>
        <View style={styles.stepBtn}>
          <Icon name="remove" size={24} color={value <= min ? colors.disabled : colors.text} />
        </View>
      </Tap>
      <MotiView key={value} from={{ scale: 1.15, opacity: 0.6 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'timing', duration: 160 }}>
        <AppText variant="title" style={{ minWidth: space.huge, textAlign: 'center' }}>
          {Number.isInteger(value) ? value : value.toFixed(1)}
        </AppText>
      </MotiView>
      <Tap onPress={() => onChange(round(Math.min(max, value + step)))} disabled={value >= max}>
        <View style={styles.stepBtn}>
          <Icon name="add" size={24} color={value >= max ? colors.disabled : colors.text} />
        </View>
      </Tap>
    </View>
  );
}

// ---------- Bottom sheet ----------
export function Sheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.scrim}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <MotiView
          from={{ translateY: 80, opacity: 0 }}
          animate={{ translateY: 0, opacity: 1 }}
          transition={{ type: 'timing', duration: 260 }}
          style={[styles.sheet, { paddingBottom: insets.bottom + space.xxl }]}
        >
          <View style={styles.sheetHeader}>
            <AppText variant="title">{title}</AppText>
            <Tap onPress={onClose}>
              <Icon name="close" size={28} color={colors.textMuted} />
            </Tap>
          </View>
          {children}
        </MotiView>
      </View>
    </Modal>
  );
}

// ---------- In-app notification banner ----------
export function Banner() {
  const { banner, dismissBanner } = useStore();
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={[styles.bannerWrap, { top: insets.top + space.sm }]}>
      <AnimatePresence>
        {banner ? (
          <MotiView
            key={banner.id}
            from={{ opacity: 0, translateY: -24 }}
            animate={{ opacity: 1, translateY: 0 }}
            exit={{ opacity: 0, translateY: -24 }}
            transition={{ type: 'timing', duration: 280 }}
          >
            <Tap onPress={dismissBanner} haptic={false} scale={0.98}>
              <View style={styles.banner}>
                <Icon name="notifications" size={24} color={colors.accent} />
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyBold">{banner.title}</AppText>
                  <AppText variant="caption" color={colors.textMuted}>
                    {banner.body}
                  </AppText>
                </View>
              </View>
            </Tap>
          </MotiView>
        ) : null}
      </AnimatePresence>
    </View>
  );
}

export function EmptyState({ icon, title, body }: { icon: IconName; title: string; body: string }) {
  return (
    <FadeIn style={{ alignItems: 'center', gap: space.sm, paddingVertical: space.giant }}>
      <Icon name={icon} size={48} color={colors.disabled} />
      <AppText variant="title">{title}</AppText>
      <AppText variant="body" color={colors.textMuted} style={{ textAlign: 'center' }}>
        {body}
      </AppText>
    </FadeIn>
  );
}

export const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    padding: space.lg,
    ...shadow,
  },
  divider: { height: 1, backgroundColor: colors.divider },
  button: {
    minHeight: 56,
    borderRadius: radius.lg,
    paddingHorizontal: space.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  buttonSecondary: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.divider,
    ...shadow,
  },
  chip: {
    minHeight: space.giant,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    backgroundColor: colors.bg,
  },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  stepBtn: {
    width: space.giant,
    height: space.giant,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.bg,
    ...shadow,
  },
  scrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(16,24,40,0.4)' },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: space.xxl,
    gap: space.lg,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bannerWrap: { position: 'absolute', left: space.lg, right: space.lg, zIndex: 100 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    padding: space.lg,
    ...shadow,
    shadowOpacity: 0.12,
    shadowRadius: 16,
  },
});
