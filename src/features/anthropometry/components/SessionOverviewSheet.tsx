import { Check, CircleAlert, CircleDashed, SkipForward } from 'lucide-react-native';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { s } from '@/theme/scale';
import { colors } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

import { fmtEs, GROUP_LABELS, GROUP_ORDER, type IsakSession, SITE_BY_ID, siteStatus, type SiteStatus } from '../engine';

type Props = {
  visible: boolean;
  session: IsakSession;
  onClose: () => void;
  onFinishEarly: () => void;
};

export const STATUS_LABELS: Record<SiteStatus, string> = {
  pending: 'Pendiente',
  skipped: 'Saltado',
  partial: 'Falta la 2.ª',
  needsThird: 'Falta la 3.ª',
  ok: 'Listo',
};

export function StatusIcon({ status }: { status: SiteStatus }) {
  if (status === 'ok') return <Check size={16} color={colors.success} strokeWidth={3} />;
  if (status === 'needsThird') return <CircleAlert size={16} color={colors.warning} />;
  if (status === 'skipped') return <SkipForward size={16} color={colors.textMuted} />;
  return <CircleDashed size={16} color={colors.textMuted} />;
}

/** Estado de todos los puntos durante la toma, con la opción de terminar ya. */
export function SessionOverviewSheet({ visible, session, onClose, onFinishEarly }: Props) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Todos los puntos">
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {GROUP_ORDER.map((group) => {
          const ids = session.sites.filter((id) => SITE_BY_ID[id].group === group);
          if (!ids.length) return null;
          return (
            <View key={group} style={styles.group}>
              <Text style={styles.groupLabel}>{GROUP_LABELS[group]}</Text>
              {ids.map((id) => {
                const status = siteStatus(session, id);
                const readings = session.readings[id] ?? [];
                const site = SITE_BY_ID[id];
                return (
                  <View key={id} style={styles.row} accessible accessibilityLabel={`${site.short}: ${STATUS_LABELS[status]}`}>
                    <StatusIcon status={status} />
                    <Text style={styles.name}>{site.short}</Text>
                    <Text style={styles.readings}>
                      {readings.length ? readings.map((r) => fmtEs(r, site.decimals)).join(' · ') : STATUS_LABELS[status]}
                    </Text>
                  </View>
                );
              })}
            </View>
          );
        })}
      </ScrollView>
      <Button title="Terminar y revisar" variant="secondary" onPress={onFinishEarly} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  scroll: { maxHeight: 460 },
  content: { gap: s(12), paddingBottom: s(8) },
  group: { gap: s(4) },
  groupLabel: { fontFamily: fonts.bodyBold, fontSize: fontSizes.label, color: colors.textSecondary, textTransform: 'uppercase' },
  row: { flexDirection: 'row', alignItems: 'center', gap: s(8), minHeight: 32 },
  name: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.text },
  readings: { fontFamily: fonts.bodySemi, fontSize: fontSizes.xs, color: colors.textSecondary },
});
