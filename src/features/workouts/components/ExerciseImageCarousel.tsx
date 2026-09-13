import { Image } from 'expo-image';
import { ChevronLeft, ChevronRight, Dumbbell, Sparkles } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';

import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts } from '@/theme/typography';
import { MuscleGroup } from '../types';

type Props = {
  images?: string[] | null;
  exerciseName?: string;
  muscleGroup?: MuscleGroup;
  height?: number;
  activeIndex?: number;
  onIndexChange?: (index: number) => void;
};

export function ExerciseImageCarousel({
  images,
  exerciseName = 'Ejercicio',
  muscleGroup = 'pecho',
  height = s(180),
  activeIndex: controlledIndex,
  onIndexChange,
}: Props) {
  const [internalIndex, setInternalIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const imageList = Array.isArray(images) && images.length > 0 ? images.filter(Boolean) : [];
  const total = imageList.length;

  const isControlled = typeof controlledIndex === 'number';
  const currentIndex = isControlled
    ? Math.min(Math.max(0, controlledIndex), Math.max(0, total - 1))
    : internalIndex;

  function setIndex(newIdx: number, animated = true) {
    if (!isControlled) {
      setInternalIndex(newIdx);
    }
    onIndexChange?.(newIdx);
    if (containerWidth > 0 && scrollRef.current) {
      scrollRef.current.scrollTo({ x: newIdx * containerWidth, animated });
    }
  }

  // Sincronizar posición de scroll cuando cambie el índice activo externamente
  useEffect(() => {
    if (containerWidth > 0 && scrollRef.current) {
      scrollRef.current.scrollTo({ x: currentIndex * containerWidth, animated: true });
    }
  }, [currentIndex, containerWidth]);

  function handlePrev() {
    if (total === 0) return;
    const target = currentIndex > 0 ? currentIndex - 1 : total - 1;
    setIndex(target);
  }

  function handleNext() {
    if (total === 0) return;
    const target = currentIndex < total - 1 ? currentIndex + 1 : 0;
    setIndex(target);
  }

  const handleLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w > 0 && w !== containerWidth) {
      setContainerWidth(w);
    }
  };

  const handleMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (containerWidth <= 0) return;
    const newIdx = Math.round(e.nativeEvent.contentOffset.x / containerWidth);
    if (newIdx >= 0 && newIdx < total && newIdx !== currentIndex) {
      if (!isControlled) {
        setInternalIndex(newIdx);
      }
      onIndexChange?.(newIdx);
    }
  };

  if (total === 0) {
    return (
      <View style={[styles.container, { height }]}>
        <View style={styles.placeholderBox}>
          <View style={styles.placeholderIconWrap}>
            <Dumbbell size={s(32)} color={colors.navy} />
          </View>
          <Text style={styles.placeholderTitle}>{exerciseName}</Text>
          <View style={styles.placeholderBadge}>
            <Text style={styles.placeholderBadgeText}>
              ENFOQUE: {muscleGroup.toUpperCase()}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }]} onLayout={handleLayout}>
      {/* ScrollView horizontal con Paging y Swipe táctil nativo */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        nestedScrollEnabled
        scrollEventThrottle={16}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        style={StyleSheet.absoluteFill}
      >
        {imageList.map((imgUrl, idx) => (
          <View
            key={`slide-${idx}-${imgUrl}`}
            style={[
              styles.slide,
              { width: containerWidth > 0 ? containerWidth : '100%', height },
            ]}
          >
            <Image
              source={{ uri: imgUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              priority={idx === 0 ? 'high' : 'normal'}
              cachePolicy="memory-disk"
              transition={200}
            />
          </View>
        ))}
      </ScrollView>

      {/* Badge de Paso actual */}
      <View style={styles.stepBadge} pointerEvents="none">
        <Sparkles size={s(10)} color={colors.lime} />
        <Text style={styles.stepBadgeText}>
          PASO {currentIndex + 1} DE {total}
        </Text>
      </View>

      {/* Controles de Navegación < y > */}
      {total > 1 && (
        <>
          <Pressable
            onPress={handlePrev}
            style={[styles.navBtn, styles.navBtnLeft]}
            hitSlop={10}
          >
            <ChevronLeft size={s(16)} color={colors.navy} />
          </Pressable>
          <Pressable
            onPress={handleNext}
            style={[styles.navBtn, styles.navBtnRight]}
            hitSlop={10}
          >
            <ChevronRight size={s(16)} color={colors.navy} />
          </Pressable>

          {/* Dots indicadores */}
          <View style={styles.dotsRow}>
            {imageList.map((_, idx) => (
              <Pressable
                key={idx}
                onPress={() => setIndex(idx)}
                style={[styles.dot, idx === currentIndex && styles.dotActive]}
              />
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#0F172A',
    borderRadius: radius.card,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.border,
  },
  slide: {
    overflow: 'hidden',
    position: 'relative',
  },
  stepBadge: {
    position: 'absolute',
    top: s(10),
    left: s(10),
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(4),
    backgroundColor: 'rgba(27, 42, 74, 0.88)',
    paddingHorizontal: s(8),
    paddingVertical: s(3),
    borderRadius: radius.chip,
    zIndex: 10,
  },
  stepBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: s(8),
    color: colors.surface,
    letterSpacing: 0.5,
  },
  navBtn: {
    position: 'absolute',
    top: '50%',
    marginTop: -s(14),
    width: s(28),
    height: s(28),
    borderRadius: s(14),
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border,
    zIndex: 10,
  },
  navBtnLeft: {
    left: s(8),
  },
  navBtnRight: {
    right: s(8),
  },
  dotsRow: {
    position: 'absolute',
    bottom: s(8),
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(5),
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    paddingHorizontal: s(8),
    paddingVertical: s(3),
    borderRadius: radius.chip,
    zIndex: 10,
  },
  dot: {
    width: s(5),
    height: s(5),
    borderRadius: s(2.5),
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  dotActive: {
    width: s(14),
    backgroundColor: colors.lime,
  },
  placeholderBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(8),
    padding: s(16),
  },
  placeholderIconWrap: {
    width: s(54),
    height: s(54),
    borderRadius: s(27),
    backgroundColor: 'rgba(255, 255, 255, 1)',
    borderWidth: 1.5,
    borderColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: s(11),
    color: colors.surface,
    textAlign: 'center',
  },
  placeholderBadge: {
    backgroundColor: colors.lime,
    paddingHorizontal: s(8),
    paddingVertical: 2,
    borderRadius: radius.chip,
  },
  placeholderBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: s(7.5),
    color: colors.navy,
  },
});
