import { CheckCircle2, CircleAlert, Info } from 'lucide-react-native';
import { useEffect } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';

import { s } from '@/theme/scale';
import { colors, radius, shadows } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

type ToastTone = 'neutral' | 'success' | 'danger';

type ToastOptions = {
  message: string;
  tone?: ToastTone;
  /** Acción opcional, p. ej. «Deshacer». */
  actionLabel?: string;
  onAction?: () => void;
  /** Milisegundos visible; con acción se deja más tiempo para poder pulsarla. */
  duration?: number;
};

type ToastState = {
  current: (ToastOptions & { id: number }) | null;
  show: (options: ToastOptions) => void;
  hide: (id?: number) => void;
};

let nextId = 1;

const useToastStore = create<ToastState>((set, get) => ({
  current: null,
  show: (options) => set({ current: { ...options, id: nextId++ } }),
  hide: (id) => {
    if (id === undefined || get().current?.id === id) set({ current: null });
  },
}));

/** Muestra un aviso breve en la parte inferior. Sustituye a Alert.alert para confirmaciones informativas. */
export function toast(options: ToastOptions | string) {
  useToastStore.getState().show(typeof options === 'string' ? { message: options } : options);
}

/** Aviso con «Deshacer»: la acción ya se hizo; `onUndo` la revierte si el usuario lo pide. */
export function toastWithUndo(message: string, onUndo: () => void) {
  toast({ message, actionLabel: 'Deshacer', onAction: onUndo, duration: 5000 });
}

const ICONS: Record<ToastTone, typeof Info> = { neutral: Info, success: CheckCircle2, danger: CircleAlert };
const ICON_COLORS: Record<ToastTone, string> = { neutral: colors.onNavyMuted, success: colors.lime, danger: '#FF9C8A' };

/** Se monta una vez en la raíz de la app. */
export function ToastHost() {
  const current = useToastStore((st) => st.current);
  const hide = useToastStore((st) => st.hide);
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!current) return;
    AccessibilityInfo.announceForAccessibility(current.message);
    const timer = setTimeout(() => hide(current.id), current.duration ?? (current.onAction ? 5000 : 3000));
    return () => clearTimeout(timer);
  }, [current, hide]);

  if (!current) return null;
  const tone = current.tone ?? 'neutral';
  const Icon = ICONS[tone];

  return (
    <View pointerEvents="box-none" style={[styles.host, { bottom: insets.bottom + s(12) }]}>
      <Animated.View
        key={current.id}
        entering={reduceMotion ? undefined : FadeInDown.duration(220)}
        exiting={reduceMotion ? undefined : FadeOutDown.duration(160)}
        style={styles.toast}
        accessibilityLiveRegion="polite"
      >
        <Icon size={18} color={ICON_COLORS[tone]} />
        <Text style={styles.message}>{current.message}</Text>
        {current.actionLabel && current.onAction ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              current.onAction?.();
              hide(current.id);
            }}
            style={styles.action}
          >
            <Text style={styles.actionText}>{current.actionLabel}</Text>
          </Pressable>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: s(12),
    right: s(12),
    alignItems: 'center',
  },
  toast: {
    width: '100%',
    maxWidth: 480,
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
    minHeight: 52,
    paddingLeft: s(14),
    paddingRight: s(6),
    paddingVertical: s(6),
    borderRadius: radius.card,
    backgroundColor: colors.navy,
    ...shadows.fab,
  },
  message: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.surface },
  action: { minHeight: 44, minWidth: 44, paddingHorizontal: s(10), alignItems: 'center', justifyContent: 'center' },
  actionText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.lime },
});
