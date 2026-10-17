import { ReactNode, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleProp,
  ViewStyle,
  KeyboardAvoidingView,
  LayoutChangeEvent,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { DURATION, EASE_OUT } from '@/lib/motion';
import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';
import { PressableScale } from './PressableScale';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Título estándar. Se omite si se pasa `header`. */
  title?: string;
  /** Cabecera propia (icono, subtítulo, botón de cerrar…): también sirve para arrastrar y cerrar. */
  header?: ReactNode;
  /**
   * Sin márgenes ni separación internos: el contenido pone los suyos (formularios largos con
   * cabecera y pie propios). El asa se dibuja encima de la cabecera. El contenido añade también
   * el margen inferior de la zona segura (useSafeAreaInsets) con el color de su pie.
   */
  bare?: boolean;
  /** Ajustes del contenedor (p. ej. color de fondo o `maxHeight`). */
  sheetStyle?: StyleProp<ViewStyle>;
  children: ReactNode;
};

// Distancia (en px) que se asume antes de medir la hoja, para que la entrada empiece fuera de pantalla
const OFFSCREEN = 800;

// iOS no presenta un Modal mientras otro se está cerrando (lo ignora y puede quedar una capa invisible
// que bloquea los toques). Mientras una hoja se cierra, las que se abren esperan a que termine.
let sheetsBusyUntil = 0;
const EXIT_GUARD_MS = DURATION.sheetOut + 120;

/**
 * Hoja inferior: sube con desaceleración suave y se cierra tocando fuera o arrastrándola hacia abajo
 * desde el asa o el título. Con «Reducir movimiento» aparece y desaparece con un fundido.
 */
export function BottomSheet({ visible, onClose, title, header, bare = false, sheetStyle, children }: Props) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(visible);
  const translateY = useSharedValue(OFFSCREEN);
  const sheetHeight = useSharedValue(OFFSCREEN);
  const progress = useSharedValue(0); // 0 cerrada · 1 abierta (fundido del fondo y modo reducido)

  const visibleRef = useRef(visible);
  useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);

  // Montar al abrir; si otra hoja se está cerrando, esperar a que termine
  useEffect(() => {
    if (!visible || mounted) return;
    const timer = setTimeout(() => setMounted(true), Math.max(0, sheetsBusyUntil - Date.now()));
    return () => clearTimeout(timer);
  }, [visible, mounted]);

  useEffect(() => {
    if (!mounted) return;
    if (visible) {
      translateY.set(reduceMotion ? 0 : sheetHeight.get());
      translateY.set(reduceMotion ? 0 : withTiming(0, { duration: DURATION.sheetIn, easing: EASE_OUT }));
      progress.set(withTiming(1, { duration: DURATION.sheetIn, easing: EASE_OUT }));
      return;
    }
    sheetsBusyUntil = Math.max(sheetsBusyUntil, Date.now() + EXIT_GUARD_MS);
    // Desmontar SIEMPRE al cerrar, aunque la animación se interrumpa (p. ej. arrastrando mientras sale):
    // una hoja cerrada pero montada sería una capa transparente que bloquea toda la pantalla
    const unmountIfClosed = () => {
      if (!visibleRef.current) setMounted(false);
    };
    const finish = () => {
      'worklet';
      scheduleOnRN(unmountIfClosed);
    };
    if (reduceMotion) {
      progress.set(withTiming(0, { duration: DURATION.sheetOut }, finish));
    } else {
      progress.set(withTiming(0, { duration: DURATION.sheetOut }));
      translateY.set(withTiming(sheetHeight.get(), { duration: DURATION.sheetOut }, finish));
    }
    const fallback = setTimeout(unmountIfClosed, EXIT_GUARD_MS);
    return () => clearTimeout(fallback);
  }, [visible, mounted, reduceMotion, translateY, progress, sheetHeight]);

  function handleLayout(e: LayoutChangeEvent) {
    sheetHeight.set(e.nativeEvent.layout.height);
  }

  const drag = Gesture.Pan()
    .activeOffsetY(8)
    .failOffsetX([-20, 20])
    .onUpdate((e) => {
      translateY.set(Math.max(0, e.translationY));
    })
    .onEnd((e) => {
      const shouldClose = e.translationY > sheetHeight.get() * 0.3 || e.velocityY > 900;
      if (shouldClose) {
        scheduleOnRN(onClose);
      } else {
        translateY.set(withSpring(0, { damping: 24, stiffness: 260 }));
      }
    });

  const animatedStyle = useAnimatedStyle(() =>
    reduceMotion ? { opacity: progress.get() } : { transform: [{ translateY: translateY.get() }] }
  );
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: reduceMotion
      ? progress.get()
      : interpolate(translateY.get(), [0, Math.max(sheetHeight.get(), 1)], [1, 0], 'clamp') * progress.get(),
  }));

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <GestureHandlerRootView style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
          <Pressable accessibilityLabel="Cerrar" style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.avoider} pointerEvents="box-none">
          <Animated.View
            onLayout={handleLayout}
            style={[
              styles.sheet,
              bare ? styles.sheetBare : { paddingBottom: insets.bottom + s(18) },
              sheetStyle,
              animatedStyle,
            ]}
            accessibilityViewIsModal
          >
            <GestureDetector gesture={drag}>
              <View style={bare ? styles.dragAreaBare : styles.dragArea}>
                <View style={[styles.handle, bare && styles.handleOverlay]} />
                {header ?? (
                  <Text style={styles.title} accessibilityRole="header">
                    {title}
                  </Text>
                )}
              </View>
            </GestureDetector>
            {children}
          </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

type FooterProps = {
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  confirmDisabled?: boolean;
  confirmLoading?: boolean;
};

/** Fila «Cancelar / acción» que cierra casi todas las hojas. */
export function SheetFooter({ onCancel, onConfirm, confirmLabel, confirmDisabled, confirmLoading }: FooterProps) {
  const disabled = confirmDisabled || confirmLoading;
  return (
    <View style={styles.footer}>
      <PressableScale accessibilityRole="button" onPress={onCancel} style={styles.cancelBtn}>
        <Text style={styles.cancelText}>Cancelar</Text>
      </PressableScale>
      <PressableScale
        accessibilityRole="button"
        accessibilityState={{ disabled, busy: confirmLoading }}
        onPress={onConfirm}
        disabled={disabled}
        style={[styles.confirmBtn, disabled && styles.confirmBtnDisabled]}
      >
        {confirmLoading ? (
          <ActivityIndicator size="small" color={colors.navy} />
        ) : (
          <Text style={styles.confirmText}>{confirmLabel}</Text>
        )}
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: {
    backgroundColor: 'rgba(18,32,61,0.55)',
  },
  avoider: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    // Siempre queda a la vista parte de la pantalla de detrás (se entiende que es una hoja)
    maxHeight: '88%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: s(18),
    gap: s(8),
  },
  sheetBare: { paddingHorizontal: 0, gap: 0, overflow: 'hidden' },
  dragAreaBare: { position: 'relative' },
  // Asa sobre la cabecera propia (que ya trae su relleno superior)
  handleOverlay: { position: 'absolute', top: 6, left: '50%', marginLeft: -20, zIndex: 1 },
  // Zona que se arrastra para cerrar: asa + título (el contenido conserva su propio scroll y toques)
  dragArea: {
    paddingTop: s(8),
    paddingBottom: s(4),
    gap: s(10),
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.headline,
    color: colors.navy,
    marginBottom: s(2),
  },
  footer: {
    flexDirection: 'row',
    gap: s(8),
    marginTop: s(6),
  },
  cancelBtn: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: s(8),
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  confirmBtn: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: s(8),
    borderRadius: radius.button,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnDisabled: { opacity: 0.5 },
  confirmText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.sm,
    color: colors.navy,
  },
});
