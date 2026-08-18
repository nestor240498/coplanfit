import { forwardRef, ReactNode, useState } from 'react';
import {
  Platform,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';

import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

type Props = TextInputProps & {
  /** Label uppercase sobre el campo (patrón del mockup "Nuevo cliente") */
  label?: string;
  error?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  containerStyle?: ViewStyle;
  wrapperStyle?: StyleProp<ViewStyle>;
};

export const Input = forwardRef<TextInput, Props>(function Input(
  { label, error, leftIcon, rightIcon, containerStyle, wrapperStyle, style, onFocus, onBlur, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={containerStyle}>
      {label != null && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputWrapper,
          focused && styles.inputWrapperFocused,
          error != null && styles.inputWrapperError,
          wrapperStyle,
          style as StyleProp<ViewStyle>,
        ]}
      >
        {leftIcon != null && <View style={styles.iconLeft}>{leftIcon}</View>}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
        {rightIcon != null && <View style={styles.iconRight}>{rightIcon}</View>}
      </View>
      {error != null && <Text style={styles.error}>{error}</Text>}
    </View>
  );
});

// Mockup: campo redondeado, limpio con soporte de iconos
const styles = StyleSheet.create({
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: s(8.5),
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: s(2),
  },
  inputWrapper: {
    minHeight: s(32),
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: s(8),
  },
  inputWrapperFocused: {
    borderColor: colors.navy,
  },
  inputWrapperError: {
    borderColor: colors.danger,
  },
  iconLeft: {
    marginRight: s(6),
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconRight: {
    marginLeft: s(6),
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    height: '100%',
    paddingVertical: 0,
    paddingHorizontal: 0,
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.text,
    ...Platform.select({
      web: {
        outlineStyle: 'none' as any,
      },
      default: {},
    }),
  },
  error: {
    fontFamily: fonts.bodyMedium,
    fontSize: s(8.5),
    color: colors.danger,
    marginTop: s(3),
  },
});
