import { useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors, fonts, radii } from '../theme';
import { elevation, motion } from '../theme/motion';

export type BatlloButtonVariant = 'primary' | 'secondary' | 'ghost' | 'ink';
export type BatlloButtonSize = 'md' | 'lg';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: BatlloButtonVariant;
  size?: BatlloButtonSize;
  disabled?: boolean;
  leading?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/**
 * Batlló CTA kit — Apple press feel × Gaudí primary radius.
 * Primary: terracotta capsule with soft corner. Ghost: text only.
 */
export function BatlloButton({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  leading,
  style,
  accessibilityLabel,
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (to: number) => {
    Animated.spring(scale, {
      toValue: to,
      useNativeDriver: true,
      speed: 40,
      bounciness: 0,
    }).start();
  };

  const isGhost = variant === 'ghost';
  const padV = size === 'lg' ? 16 : 13;
  const padH = size === 'lg' ? 22 : 18;
  const fontSize = size === 'lg' ? 16 : 15;

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        onPressIn={() => !disabled && animateTo(motion.pressScale)}
        onPressOut={() => animateTo(1)}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled }}
        style={({ pressed }) => [
          styles.base,
          { paddingVertical: padV, paddingHorizontal: padH },
          variant === 'primary' && styles.primary,
          variant === 'secondary' && styles.secondary,
          variant === 'ink' && styles.ink,
          isGhost && styles.ghost,
          disabled && styles.disabled,
          pressed && !disabled && !isGhost && styles.pressedFill,
        ]}
      >
        {leading ? <View style={styles.leading}>{leading}</View> : null}
        <Text
          style={[
            styles.label,
            { fontSize },
            variant === 'primary' && styles.labelOnDark,
            variant === 'ink' && styles.labelOnDark,
            variant === 'secondary' && styles.labelInk,
            isGhost && styles.labelGhost,
            disabled && styles.labelDisabled,
          ]}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    ...radii.primaryButton,
  },
  primary: {
    backgroundColor: colors.terracotta,
    ...elevation.button,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borders,
  },
  ink: {
    backgroundColor: colors.ink,
    ...elevation.button,
  },
  ghost: {
    backgroundColor: 'transparent',
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  disabled: { opacity: 0.4 },
  pressedFill: { opacity: 0.92 },
  leading: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: fonts.bodySemi,
  },
  labelOnDark: { color: colors.white },
  labelInk: { color: colors.ink },
  labelGhost: { color: colors.terracotta },
  labelDisabled: { color: colors.secondaryText },
});
