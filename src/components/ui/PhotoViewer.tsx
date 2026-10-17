import { X } from 'lucide-react-native';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { s } from '@/theme/scale';
import { colors } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

import { StorageImage } from './StorageImage';

export type PhotoPreview = { url: string; title: string; date: string };

type Props = {
  preview: PhotoPreview | null;
  onClose: () => void;
};

// Distancia a partir de la cual soltar la foto la cierra
const DISMISS_DISTANCE = 120;

/**
 * Foto de cliente a pantalla completa (confidencial: se carga con URL firmada vía StorageImage).
 * Se cierra con la X, con el gesto «atrás» o deslizando la foto hacia arriba o abajo.
 */
export function PhotoViewer({ preview, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const offsetY = useSharedValue(0);

  function close() {
    offsetY.set(0);
    onClose();
  }

  const drag = Gesture.Pan()
    .activeOffsetY([-10, 10])
    .onUpdate((e) => {
      offsetY.set(e.translationY);
    })
    .onEnd((e) => {
      if (Math.abs(e.translationY) > DISMISS_DISTANCE || Math.abs(e.velocityY) > 1000) {
        scheduleOnRN(close);
      } else {
        offsetY.set(reduceMotion ? 0 : withSpring(0, { damping: 22, stiffness: 240 }));
      }
    });

  const imageStyle = useAnimatedStyle(() =>
    reduceMotion
      ? {}
      : {
          transform: [
            { translateY: offsetY.get() },
            { scale: interpolate(Math.abs(offsetY.get()), [0, 400], [1, 0.9], 'clamp') },
          ],
        }
  );
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(Math.abs(offsetY.get()), [0, 300], [1, 0.4], 'clamp'),
  }));

  return (
    <Modal visible={preview != null} transparent animationType="fade" statusBarTranslucent onRequestClose={close}>
      <GestureHandlerRootView style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]} />
        <View style={[styles.content, { paddingTop: insets.top + s(8), paddingBottom: insets.bottom + s(16) }]}>
          <View style={styles.header}>
            <View style={styles.headerTexts}>
              <Text style={styles.title}>{preview?.title}</Text>
              <Text style={styles.subtitle}>{preview?.date}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar foto"
              onPress={close}
              style={styles.closeBtn}
              hitSlop={10}
            >
              <X size={18} color={colors.surface} />
            </Pressable>
          </View>

          {preview && (
            <GestureDetector gesture={drag}>
              <Animated.View
                style={[styles.imageContainer, imageStyle]}
                accessible
                accessibilityLabel={`Foto: ${preview.title}, ${preview.date}. Desliza hacia abajo para cerrar.`}
              >
                <StorageImage mediaRef={preview.url} style={styles.image} contentFit="contain" />
              </Animated.View>
            </GestureDetector>
          )}

          <Text style={styles.hint}>Desliza la foto para cerrar</Text>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: { backgroundColor: 'rgba(10, 15, 26, 0.96)' },
  content: { flex: 1, paddingHorizontal: s(16) },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: s(12) },
  headerTexts: { flex: 1 },
  title: { fontFamily: fonts.headingSemi, fontSize: fontSizes.base, color: colors.surface },
  subtitle: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.onNavyMuted, marginTop: 2 },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainer: { flex: 1, marginVertical: s(16) },
  image: { width: '100%', height: '100%' },
  hint: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.onNavyMuted, textAlign: 'center' },
});
