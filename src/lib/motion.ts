import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { Easing } from 'react-native-reanimated';

/**
 * Lenguaje de movimiento de CoplanFit: rápido y funcional (es una herramienta de trabajo).
 * - Respuesta a un toque: 100–150 ms. Cambio de estado: 200–250 ms. Hojas y vistas: 280–320 ms.
 * - Salidas más rápidas que las entradas. Desaceleración exponencial, sin rebotes gratuitos.
 * - Siempre con alternativa para «Reducir movimiento» (useReducedMotion de Reanimated).
 */
export const DURATION = {
  press: 120,
  state: 220,
  sheetIn: 300,
  sheetOut: 220,
} as const;

/** Llegada segura y suave (equivalente a cubic-bezier(0.16, 1, 0.3, 1)). */
export const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);

/** Muelle para respuestas táctiles: sin rebote visible. */
export const PRESS_SPRING = { damping: 22, stiffness: 420, mass: 0.6 } as const;

const hapticsAvailable = Platform.OS === 'ios' || Platform.OS === 'android';

/** Toque ligero al cambiar de selección (pestañas, chips). */
export function hapticSelection() {
  if (hapticsAvailable) Haptics.selectionAsync().catch(() => {});
}

/** Toque al pulsar una acción principal. */
export function hapticPress() {
  if (hapticsAvailable) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/** Confirmación de que algo importante salió bien (publicar, enviar). */
export function hapticSuccess() {
  if (hapticsAvailable) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
