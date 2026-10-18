import { Camera, ChevronRight } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/ui/PressableScale';
import type { Measurement, MeasurementProtocol } from '@/features/clients/types';
import { formatDateShort } from '@/lib/format';
import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

import { fmtEs } from '../engine';

const TYPE_LABELS: Record<MeasurementProtocol, string> = {
  isak_restricted: 'ISAK',
  skinfolds: 'Pliegues',
  manual: 'Rápida',
  import: 'Importada',
};

/** Cuántas evaluaciones se ven en la ficha; el resto, en el historial. */
export const VISIBLE_EVALUATIONS = 3;

type Props = {
  /** Más reciente primero. */
  measurements: Measurement[];
  onOpen: (measurementId: string) => void;
  onViewAll: () => void;
};

/** Últimas evaluaciones del cliente, de cualquier tipo: fecha, tipo y las cifras que importan. Toca una para ver su análisis. */
export function EvaluationsList({ measurements, onOpen, onViewAll }: Props) {
  if (measurements.length === 0) return null;
  const shown = measurements.slice(0, VISIBLE_EVALUATIONS);
  const extra = measurements.length - shown.length;
  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          Evaluaciones ({measurements.length})
        </Text>
        {measurements.length > 1 ? (
          <PressableScale accessibilityRole="button" onPress={onViewAll} style={styles.link}>
            <Text style={styles.linkText}>{extra > 0 ? `Ver todas (${measurements.length})` : 'Historial y comparar'}</Text>
          </PressableScale>
        ) : null}
      </View>
      <View style={styles.rows}>
      {shown.map((m, i) => {
        const type = TYPE_LABELS[m.protocol ?? 'manual'];
        const facts = [
          m.weight_kg != null ? `${fmtEs(m.weight_kg, 1)} kg` : null,
          m.body_fat_pct != null ? `${fmtEs(m.body_fat_pct, 1)} % grasa` : null,
        ].filter(Boolean);
        const photos = m.photos?.length ?? 0;
        return (
          <PressableScale
            key={m.id}
            accessibilityRole="button"
            accessibilityLabel={`Evaluación ${type} del ${formatDateShort(m.measured_at)}. ${facts.join(', ')}. Ver análisis`}
            onPress={() => onOpen(m.id)}
            style={[styles.row, i > 0 && styles.rowDivider]}
          >
            <View style={styles.main}>
              <View style={styles.topLine}>
                <Text style={styles.date}>{formatDateShort(m.measured_at)}</Text>
                <View style={styles.pill}>
                  <Text style={styles.pillText}>{type}</Text>
                </View>
                {i === 0 ? <Text style={styles.latest}>Última</Text> : null}
                {photos > 0 ? <Camera size={14} color={colors.textMuted} /> : null}
              </View>
              <Text style={styles.facts}>{facts.length ? facts.join(' · ') : 'Sin peso ni % de grasa'}</Text>
            </View>
            <ChevronRight size={20} color={colors.textMuted} />
          </PressableScale>
        );
      })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Una sola tarjeta con filas separadas por una línea, para que la lista se lea como un bloque propio
  wrap: {
    paddingTop: s(4),
    paddingBottom: s(4),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48, paddingLeft: s(16), paddingRight: s(8) },
  title: { fontFamily: fonts.heading, fontSize: fontSizes.base, color: colors.navy },
  link: { minHeight: 44, justifyContent: 'center', paddingHorizontal: s(8) },
  linkText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.navy },
  rows: {},
  row: { flexDirection: 'row', alignItems: 'center', gap: s(8), minHeight: 64, paddingVertical: s(10), paddingHorizontal: s(16) },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  main: { flex: 1, gap: s(4) },
  topLine: { flexDirection: 'row', alignItems: 'center', gap: s(8), flexWrap: 'wrap' },
  date: { fontFamily: fonts.bodyBold, fontSize: fontSizes.base, color: colors.navy },
  pill: { paddingHorizontal: s(8), paddingVertical: 2, borderRadius: radius.pill, backgroundColor: colors.neutralChipBg },
  pillText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.label, color: colors.navy },
  latest: { fontFamily: fonts.bodySemi, fontSize: fontSizes.label, color: colors.success },
  facts: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary },
});
