import { ComponentType } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { s } from '@/theme/scale';
import { colors } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

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

/** Mockup (tabs de ficha de cliente): fila con borde inferior, activa en navy 700 + subrayado lima 2px con icono y scroll horizontal. */
export function TabBar<T extends string>({ items, active, onChange }: Props<T>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.row}
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
            onPress={() => onChange(item.key)}
            style={[styles.tab, isActive && styles.tabActive]}
          >
            {Icon && <Icon size={s(13)} color={iconColor} strokeWidth={isActive ? 2.5 : 2} />}
            <Text style={[styles.label, isActive && styles.labelActive]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexGrow: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: s(16),
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(5),
    paddingVertical: s(10),
    marginRight: s(16),
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.lime,
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


