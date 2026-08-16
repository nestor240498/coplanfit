import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { ComponentType } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { s } from '@/theme/scale';
import { colors } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

export type BreadcrumbItem = {
  label: string;
  href?: string;
  icon?: ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  onPress?: () => void;
};

type Props = {
  items: BreadcrumbItem[];
};

export function Breadcrumbs({ items }: Props) {
  const router = useRouter();

  function handlePress(item: BreadcrumbItem) {
    if (item.onPress) {
      item.onPress();
    } else if (item.href) {
      router.push(item.href as never);
    }
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const isClickable = !isLast && (item.href != null || item.onPress != null);
        const Icon = item.icon;

        return (
          <View key={`${item.label}-${index}`} style={styles.itemWrapper}>
            {index > 0 && (
              <ChevronRight
                size={s(10)}
                color="rgba(255, 255, 255, 0.35)"
                strokeWidth={2}
                style={styles.separator}
              />
            )}

            <Pressable
              onPress={() => handlePress(item)}
              disabled={!isClickable}
              style={({ pressed }) => [
                styles.itemContent,
                isClickable && styles.clickable,
                pressed && isClickable && styles.pressed,
              ]}
              hitSlop={6}
            >
              {Icon && (
                <Icon
                  size={s(10)}
                  color={isLast ? colors.lime : 'rgba(255, 255, 255, 0.65)'}
                  strokeWidth={2}
                />
              )}
              <Text
                style={[
                  styles.label,
                  isLast && styles.labelActive,
                  isClickable && styles.labelClickable,
                ]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: s(2),
  },
  itemWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  separator: {
    marginHorizontal: s(3),
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(3),
  },
  clickable: {
    cursor: Platform.OS === 'web' ? ('pointer' as unknown as undefined) : undefined,
  },
  pressed: {
    opacity: 0.6,
  },
  label: {
    fontFamily: fonts.body,
    fontSize: s(7.5),
    color: 'rgba(255, 255, 255, 0.7)',
  },
  labelClickable: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  labelActive: {
    fontFamily: fonts.bodySemi,
    color: colors.lime,
  },
});
