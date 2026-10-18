import { ClipboardCheck, FileUp, Ruler, Scale } from 'lucide-react-native';
import type { ComponentType, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { PressableScale } from '@/components/ui/PressableScale';
import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes, lineHeights } from '@/theme/typography';

export type RegisterChoice = 'basic' | 'skinfolds' | 'isak' | 'import_pdf';

type Props = {
  visible: boolean;
  onClose: () => void;
  onChoose: (choice: RegisterChoice) => void;
};

type IconType = ComponentType<{ size?: number; color?: string }>;

/** Punto de entrada único para registrar medidas: el entrenador elige cuánto quiere medir. */
export function RegisterMeasurementsSheet({ visible, onClose, onChoose }: Props) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title="¿Qué quieres registrar?">
      <View style={styles.body}>
        <Option
          icon={Scale}
          title="Medidas con cinta y báscula"
          text="Peso, cintura, cadera, pecho, brazos y fotos."
          time="2 min"
          onPress={() => onChoose('basic')}
        />
        <Option
          icon={Ruler}
          title="Pliegues (Jackson-Pollock)"
          text="3 o 7 pliegues con plicómetro para calcular el % de grasa."
          time="5 min"
          onPress={() => onChoose('skinfolds')}
        />
        <Option
          icon={ClipboardCheck}
          title="Protocolo ISAK"
          text="21 medidas del lado derecho con doble lectura. Calcula composición, somatotipo y proporcionalidad."
          time="20 min"
          onPress={() => onChoose('isak')}
        />

        <PressableScale accessibilityRole="button" onPress={() => onChoose('import_pdf')} style={styles.importRow}>
          <FileUp size={18} color={colors.navy} />
          <Text style={styles.importText}>Importar un informe PDF de ISAKmetry</Text>
        </PressableScale>
      </View>
    </BottomSheet>
  );
}

function Option({ icon: Icon, title, text, time, onPress }: { icon: IconType; title: string; text: string; time: string; onPress: () => void }): ReactNode {
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={`${title}. ${text} Unos ${time}.`} onPress={onPress} style={styles.option}>
      <View style={styles.iconBox}>
        <Icon size={22} color={colors.navy} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.meta}>{text}</Text>
      </View>
      <View style={styles.timeBadge}>
        <Text style={styles.timeText}>{time}</Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { gap: s(10), paddingBottom: s(8) },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(12),
    minHeight: 72,
    padding: s(14),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.successBg,
  },
  title: { fontFamily: fonts.bodyBold, fontSize: fontSizes.base, color: colors.navy },
  meta: { fontFamily: fonts.body, fontSize: fontSizes.xs, lineHeight: lineHeights.xs, color: colors.textSecondary },
  timeBadge: { paddingHorizontal: s(8), paddingVertical: s(4), borderRadius: radius.pill, backgroundColor: colors.background },
  timeText: { fontFamily: fonts.bodySemi, fontSize: fontSizes.label, color: colors.textSecondary },
  importRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: s(8), minHeight: 48 },
  importText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.navy },
});
