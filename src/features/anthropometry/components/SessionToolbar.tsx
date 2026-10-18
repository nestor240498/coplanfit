import { ListChecks, Pause, Trash2, Volume2, VolumeX } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { s } from '@/theme/scale';
import { colors } from '@/theme/tokens';
import { fonts, fontSizes, TIGHT_FONT_SCALE } from '@/theme/typography';

type Props = {
  /** Punto actual y total de la ronda (la barra fina y «3 de 21»). */
  step?: { current: number; total: number };
  voice?: boolean;
  onToggleVoice?: () => void;
  onOpenOverview?: () => void;
  onDiscard: () => void;
  onPause: () => void;
};

/** Barra fija bajo la cabecera con el progreso y las acciones de la toma: voz, lista, descartar y pausar. */
export function SessionToolbar({ step, voice, onToggleVoice, onOpenOverview, onDiscard, onPause }: Props) {
  return (
    <View style={styles.wrap}>
    <View style={styles.bar}>
      {step ? (
        <Text style={styles.label} maxFontSizeMultiplier={TIGHT_FONT_SCALE} accessibilityLabel={`Punto ${step.current} de ${step.total}`}>
          {step.current} <Text style={styles.labelMuted}>de {step.total}</Text>
        </Text>
      ) : (
        <View style={styles.flex} />
      )}
      <View style={styles.actions}>
        {onToggleVoice ? (
          <Pressable accessibilityRole="button" accessibilityLabel={voice ? 'Desactivar la voz' : 'Activar la voz'} onPress={onToggleVoice} style={styles.btn}>
            {voice ? <Volume2 size={20} color={colors.navy} /> : <VolumeX size={20} color={colors.textMuted} />}
          </Pressable>
        ) : null}
        {onOpenOverview ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Ver todos los puntos" onPress={onOpenOverview} style={styles.btn}>
            <ListChecks size={20} color={colors.navy} />
          </Pressable>
        ) : null}
        <View style={styles.divider} />
        <Pressable accessibilityRole="button" accessibilityLabel="Descartar la medición" onPress={onDiscard} style={styles.btn}>
          <Trash2 size={20} color={colors.danger} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Pausar y guardar borrador" onPress={onPause} style={styles.btn}>
          <Pause size={20} color={colors.navy} />
        </Pressable>
      </View>
    </View>
    {step ? (
      <View style={styles.track} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={[styles.fill, { width: `${Math.min(100, (step.current / Math.max(1, step.total)) * 100)}%` }]} />
      </View>
    ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  flex: { flex: 1 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: s(8),
    minHeight: 52,
    paddingLeft: s(16),
    paddingRight: s(8),
  },
  label: { flex: 1, fontFamily: fonts.heading, fontSize: fontSizes.headline, color: colors.navy },
  labelMuted: { fontFamily: fonts.bodySemi, fontSize: fontSizes.sm, color: colors.textSecondary },
  track: { height: 4, backgroundColor: colors.border },
  fill: { height: 4, backgroundColor: colors.navy },
  actions: { flexDirection: 'row', alignItems: 'center', gap: s(2) },
  btn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  divider: { width: 1, height: 24, marginHorizontal: s(4), backgroundColor: colors.border },
});
