import { ClipboardList, Dumbbell, FileText, Ruler, Salad } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { formatDateShort } from '@/lib/format';
import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';
import { listSentLog, SentKind, SentLogEntry } from '../sentLogRepository';

const ICONS: Record<SentKind, typeof FileText> = {
  plan: Salad,
  rutina: Dumbbell,
  medicion: Ruler,
  comparativa: Ruler,
  informe: ClipboardList,
};

type Props = {
  clientId: string;
  /** Cambia cada vez que se envía algo, para recargar la lista. */
  refreshKey: number;
};

/** "Enviado al cliente": qué documentos se le compartieron y cuándo. */
export function SentHistory({ clientId, refreshKey }: Props) {
  const [entries, setEntries] = useState<SentLogEntry[] | null>(null);

  useEffect(() => {
    let active = true;
    listSentLog(clientId, 10)
      .then((rows) => active && setEntries(rows))
      .catch(() => active && setEntries([]));
    return () => {
      active = false;
    };
  }, [clientId, refreshKey]);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Enviado al cliente</Text>
      {entries === null ? null : entries.length === 0 ? (
        <Text style={styles.empty}>
          Todavía no le has enviado nada. Lo que compartas desde «Enviar» aparecerá aquí con su fecha.
        </Text>
      ) : (
        entries.map((entry) => {
          const Icon = ICONS[entry.kind] ?? FileText;
          return (
            <View key={entry.id} style={styles.row}>
              <Icon size={s(14)} color={colors.navy} />
              <Text style={styles.label} numberOfLines={1}>
                {entry.label}
              </Text>
              <Text style={styles.date}>{formatDateShort(entry.created_at)}</Text>
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: s(12),
    gap: s(6),
  },
  title: { fontFamily: fonts.headingSemi, fontSize: fontSizes.sm, color: colors.navy },
  empty: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textSecondary },
  row: { flexDirection: 'row', alignItems: 'center', gap: s(8), minHeight: 32 },
  label: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: fontSizes.xs, color: colors.text },
  date: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textSecondary },
});
