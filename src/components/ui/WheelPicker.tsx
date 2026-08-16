import { useCallback, useEffect, useRef } from 'react';
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { s } from '@/theme/scale';
import { colors } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

const ITEM_HEIGHT = s(26);
const VISIBLE_ROWS = 5;
const PAD_ROWS = Math.floor(VISIBLE_ROWS / 2);

type Props = {
  options: string[];
  value: string;
  onChange: (value: string) => void;
};

/** Mockup ("Agregar comida" — hora recomendada): columna tipo rueda con soporte para scroll y tap directo en números. */
export function WheelColumn({ options, value, onChange }: Props) {
  const listRef = useRef<FlatList<string>>(null);

  // Centra la lista cuando cambia el valor
  const syncScrollToValue = useCallback(
    (animated = true) => {
      const idx = Math.max(0, options.indexOf(value));
      listRef.current?.scrollToOffset({ offset: idx * ITEM_HEIGHT, animated });
    },
    [options, value]
  );

  useEffect(() => {
    // Posiciona la rueda al montar
    const timer = setTimeout(() => {
      syncScrollToValue(false);
    }, 50);
    return () => clearTimeout(timer);
  }, [syncScrollToValue]);

  const handleScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = e.nativeEvent.contentOffset.y;
      const index = Math.round(offsetY / ITEM_HEIGHT);
      const clamped = Math.min(Math.max(index, 0), options.length - 1);
      const next = options[clamped];
      if (next != null && next !== value) {
        onChange(next);
      }
    },
    [options, value, onChange]
  );

  function handleItemPress(item: string) {
    if (item !== value) {
      onChange(item);
      const idx = options.indexOf(item);
      if (idx >= 0) {
        listRef.current?.scrollToOffset({ offset: idx * ITEM_HEIGHT, animated: true });
      }
    }
  }

  return (
    <View style={styles.column}>
      <FlatList
        ref={listRef}
        data={options}
        keyExtractor={(item) => item}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        snapToAlignment="center"
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * PAD_ROWS }}
        style={{ height: ITEM_HEIGHT * VISIBLE_ROWS }}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
        getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
        renderItem={({ item }) => {
          const selected = item === value;
          return (
            <Pressable
              onPress={() => handleItemPress(item)}
              style={({ pressed }) => [
                styles.row,
                selected && styles.rowSelected,
                pressed && styles.rowPressed,
              ]}
              hitSlop={2}
            >
              <Text style={[styles.rowText, selected && styles.rowTextSelected]}>{item}</Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  column: { width: s(46) },
  row: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: Platform.OS === 'web' ? ('pointer' as unknown as undefined) : undefined,
  },
  rowPressed: { opacity: 0.7 },
  rowSelected: {
    backgroundColor: colors.successBg,
    borderRadius: s(6),
  },
  rowText: {
    fontFamily: fonts.bodyMedium,
    fontSize: s(11),
    color: '#B0B8C8',
  },
  rowTextSelected: {
    fontFamily: fonts.heading,
    fontSize: s(13),
    color: colors.navy,
    fontWeight: '800',
  },
});

