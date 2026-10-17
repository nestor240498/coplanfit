import { ComponentType, useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { DURATION, EASE_OUT, hapticSelection } from '@/lib/motion';
import { s } from '@/theme/scale';
import { colors } from '@/theme/tokens';
import { fonts, fontSizes, TIGHT_FONT_SCALE } from '@/theme/typography';

export type TabItem<T extends string> = {
  key: T;
  label: string;
  icon?: ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
};

type Props<T extends string> = {
  items: TabItem<T>[];
  active: T;
  onChange: (key: T) => void;
};

const SIDE_PADDING = s(16);

/**
 * Pestañas con scroll horizontal. El subrayado lima se desliza hasta la pestaña activa y la barra
 * se desplaza sola para que la activa siempre se vea entera.
 */
export function TabBar<T extends string>({ items, active, onChange }: Props<T>) {
  const scrollRef = useRef<ScrollView>(null);
  const { width: viewportWidth } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const [layouts, setLayouts] = useState<Record<string, { x: number; width: number }>>({});
  const indicatorX = useSharedValue(0);
  const indicatorW = useSharedValue(0);

  const activeLayout = layouts[active];

  useEffect(() => {
    if (!activeLayout) return;
    const animate = (v: number) => (reduceMotion ? v : withTiming(v, { duration: DURATION.state, easing: EASE_OUT }));
    indicatorX.set(animate(activeLayout.x));
    indicatorW.set(animate(activeLayout.width));
    // Centrar la pestaña activa dentro de lo posible
    const target = Math.max(0, activeLayout.x + activeLayout.width / 2 - viewportWidth / 2);
    scrollRef.current?.scrollTo({ x: target, animated: !reduceMotion });
  }, [activeLayout, reduceMotion, viewportWidth, indicatorX, indicatorW]);

  const indicatorStyle = useAnimatedStyle(() => ({
    width: indicatorW.get(),
    transform: [{ translateX: indicatorX.get() }],
  }));

  function handleLayout(key: string, e: LayoutChangeEvent) {
    const { x, width } = e.nativeEvent.layout;
    setLayouts((prev) => (prev[key]?.x === x && prev[key]?.width === width ? prev : { ...prev, [key]: { x, width } }));
  }

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        accessibilityRole="tablist"
      >
        {items.map((item) => {
          const isActive = item.key === active;
          const Icon = item.icon;
          const iconColor = isActive ? colors.navy : colors.textMuted;

          return (
            <Pressable
              key={item.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              onLayout={(e) => handleLayout(item.key, e)}
              onPress={() => {
                if (!isActive) hapticSelection();
                onChange(item.key);
              }}
              style={styles.tab}
            >
              {Icon && <Icon size={16} color={iconColor} strokeWidth={isActive ? 2.5 : 2} />}
              <Text style={[styles.label, isActive && styles.labelActive]} maxFontSizeMultiplier={TIGHT_FONT_SCALE}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
        <Animated.View pointerEvents="none" style={[styles.indicator, indicatorStyle]} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIDE_PADDING,
    gap: s(16),
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(5),
    minHeight: 44,
  },
  // Subrayado de la pestaña activa: se posiciona respecto al contenido del scroll
  indicator: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    height: 3,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    backgroundColor: colors.lime,
  },
  label: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.textMuted,
  },
  labelActive: {
    fontFamily: fonts.bodyBold,
    color: colors.navy,
  },
});
