import { CircleHelp } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes, lineHeights } from '@/theme/typography';

import type { Band, Tone } from '../engine';
import { toneColor } from '../report';

/**
 * Tarjeta del análisis: misma cabecera (altura fija, con o sin «¿Qué significa?»), mismo relleno y
 * mismo hueco entre filas en todas las secciones.
 */
export function AnalysisCard({ title, onExplain, children }: { title: string; onExplain?: () => void; children: ReactNode }) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        {onExplain ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Qué significa: ${title}`}
            onPress={onExplain}
            hitSlop={8}
            style={styles.helpBtn}
          >
            <CircleHelp size={18} color={colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

/** Fila etiqueta · valor, con una nota opcional debajo. */
export function KV({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLine}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
      {note ? <Text style={styles.note}>{note}</Text> : null}
    </View>
  );
}

const TONE_BG: Record<Tone, string> = { good: colors.successBg, warn: '#FFF4DB', bad: colors.dangerBg, neutral: colors.background };

/** Etiqueta de rango («Normopeso», «Riesgo bajo») con el color de su tramo. */
export function BandTag({ band }: { band: Band }) {
  return (
    <View style={[styles.tag, { backgroundColor: TONE_BG[band.tone] }]}>
      <Text style={[styles.tagText, { color: toneColor(band.tone) }]}>{band.label}</Text>
    </View>
  );
}

/** Indicador con rango: nombre y valor en una línea, la etiqueta de rango debajo (siempre igual) y la barra. */
export function IndicatorRow({ label, value, band, children }: { label: string; value: string; band: Band | null; children?: ReactNode }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLine}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
      {band ? <BandTag band={band} /> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: s(8),
    padding: s(16),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: s(8), minHeight: 28, marginBottom: s(2) },
  title: { flex: 1, fontFamily: fonts.heading, fontSize: fontSizes.base, color: colors.navy },
  helpBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', marginRight: -s(4) },
  row: { gap: s(6), paddingVertical: s(4) },
  rowLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: s(12) },
  label: { flexShrink: 1, fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.text },
  value: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.navy, textAlign: 'right' },
  note: { fontFamily: fonts.body, fontSize: fontSizes.xs, lineHeight: lineHeights.xs, color: colors.textSecondary },
  tag: { alignSelf: 'flex-start', paddingHorizontal: s(10), paddingVertical: 3, borderRadius: radius.pill },
  tagText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.label },
});
