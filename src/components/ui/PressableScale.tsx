import { forwardRef } from 'react';
import { GestureResponderEvent, Pressable, PressableProps, StyleProp, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { DURATION, PRESS_SPRING } from '@/lib/motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  /** Escala al pulsar (0.97 por defecto; tarjetas grandes usan menos). */
  pressedScale?: number;
};

/**
 * Pressable que se encoge levemente al pulsar, en el hilo de UI.
 * Con «Reducir movimiento» no escala: baja un poco la opacidad, que también confirma el toque.
 */
export const PressableScale = forwardRef<View, Props>(function PressableScale(
  { pressedScale = 0.97, onPressIn, onPressOut, style, disabled, ...rest },
  ref
) {
  const reduceMotion = useReducedMotion();
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() =>
    reduceMotion
      ? { opacity: 1 - pressed.get() * 0.25 }
      : { transform: [{ scale: 1 - pressed.get() * (1 - pressedScale) }] }
  );

  function handlePressIn(e: GestureResponderEvent) {
    pressed.set(reduceMotion ? withTiming(1, { duration: DURATION.press }) : withSpring(1, PRESS_SPRING));
    onPressIn?.(e);
  }

  function handlePressOut(e: GestureResponderEvent) {
    pressed.set(reduceMotion ? withTiming(0, { duration: DURATION.press }) : withSpring(0, PRESS_SPRING));
    onPressOut?.(e);
  }

  return (
    <AnimatedPressable
      ref={ref}
      {...rest}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, animatedStyle]}
    />
  );
});
