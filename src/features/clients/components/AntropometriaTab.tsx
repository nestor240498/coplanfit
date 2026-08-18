import { Pressable, StyleSheet, Text, View } from 'react-native';

import { InputFieldRow } from '@/components/ui/FieldRow';
import { formatDateShort } from '@/lib/format';
import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

import { Measurement } from '../types';

export type MeasurementFormState = {
  // Composición corporal
  weight: string;
  height: string;
  bodyFat: string;
  muscleMass: string;
  visceralFat: string;
  bmrKcal: string;
  // Perímetros corporales (cm)
  neck: string;
  shoulders: string;
  chest: string;
  waist: string;
  abdomen: string;
  hip: string;
  armRight: string;
  armLeft: string;
  armFlexedRight: string;
  armFlexedLeft: string;
  forearmRight: string;
  forearmLeft: string;
  thighRight: string;
  thighLeft: string;
  calfRight: string;
  calfLeft: string;
  // Plicometría (mm)
  triceps: string;
  biceps: string;
  subscapular: string;
  supraspinal: string;
  suprailiac: string;
  abdominal: string;
  thighSkin: string;
  calfSkin: string;
  chestSkin: string;
};

type Props = {
  measurement: Measurement | null;
  isEditing?: boolean;
  formState?: MeasurementFormState;
  onChangeFormState?: (key: keyof MeasurementFormState, value: string) => void;
  onViewHistory: () => void;
};

function fmt(value: number | null | undefined, unit: string, decimals = 0): string {
  if (value == null) return '—';
  return `${value.toFixed(decimals)} ${unit}`.trim();
}

export function AntropometriaTab({
  measurement,
  isEditing = false,
  formState,
  onChangeFormState,
  onViewHistory,
}: Props) {
  // Cálculo dinámico en vivo durante la edición
  const editWeightNum = formState ? Number(formState.weight.replace(',', '.')) : NaN;
  const rawHeightNum = formState ? Number(formState.height.replace(',', '.')) : NaN;
  const editWaistNum = formState ? Number(formState.waist.replace(',', '.')) : NaN;
  const editHipNum = formState ? Number(formState.hip.replace(',', '.')) : NaN;

  const heightInMeters =
    !Number.isNaN(rawHeightNum) && rawHeightNum > 0
      ? rawHeightNum > 3
        ? rawHeightNum / 100
        : rawHeightNum
      : NaN;

  const liveBmi =
    !Number.isNaN(editWeightNum) && !Number.isNaN(heightInMeters) && heightInMeters > 0
      ? (editWeightNum / (heightInMeters * heightInMeters)).toFixed(1)
      : null;

  const liveWaistHip =
    !Number.isNaN(editWaistNum) && !Number.isNaN(editHipNum) && editHipNum > 0
      ? (editWaistNum / editHipNum).toFixed(2)
      : null;

  // Sumatoria de pliegues en vivo
  const skinFoldsList = formState
    ? [
        formState.triceps,
        formState.biceps,
        formState.subscapular,
        formState.supraspinal,
        formState.suprailiac,
        formState.abdominal,
        formState.thighSkin,
        formState.calfSkin,
        formState.chestSkin,
      ]
    : [];
  const skinFoldsSum = skinFoldsList.reduce((acc, curr) => {
    const val = Number(curr.replace(',', '.'));
    return !Number.isNaN(val) && val > 0 ? acc + val : acc;
  }, 0);

  if (isEditing && formState && onChangeFormState) {
    return (
      <View style={styles.container}>
        {/* COMPOSICIÓN CORPORAL */}
        <Text style={styles.sectionHeader}>COMPOSICIÓN CORPORAL</Text>
        <InputFieldRow
          label="Peso"
          value={formState.weight}
          onChangeText={(v) => onChangeFormState('weight', v)}
          suffix="kg"
        />
        <InputFieldRow
          label="Estatura"
          value={formState.height}
          onChangeText={(v) => onChangeFormState('height', v)}
          suffix="cm"
        />
        <InputFieldRow
          label="Porcentaje de grasa"
          value={formState.bodyFat}
          onChangeText={(v) => onChangeFormState('bodyFat', v)}
          suffix="%"
        />
        <InputFieldRow
          label="Masa muscular"
          value={formState.muscleMass}
          onChangeText={(v) => onChangeFormState('muscleMass', v)}
          suffix="%"
        />
        <InputFieldRow
          label="Grasa visceral"
          value={formState.visceralFat}
          onChangeText={(v) => onChangeFormState('visceralFat', v)}
          suffix="nivel"
        />
        <InputFieldRow
          label="Metabolismo basal (BMR)"
          value={formState.bmrKcal}
          onChangeText={(v) => onChangeFormState('bmrKcal', v)}
          suffix="kcal"
        />

        {/* INDICADORES CALCULADOS */}
        <Text style={styles.sectionHeader}>INDICADORES Y RATIOS</Text>
        <View style={styles.computedRow}>
          <Text style={styles.computedLabel}>Índice de masa corporal (IMC)</Text>
          <Text style={styles.computedValue}>{liveBmi ? `${liveBmi} (calculado)` : '—'}</Text>
        </View>
        <View style={styles.computedRow}>
          <Text style={styles.computedLabel}>Relación cintura/cadera</Text>
          <Text style={styles.computedValue}>{liveWaistHip ? `${liveWaistHip} (calculado)` : '—'}</Text>
        </View>
        {skinFoldsSum > 0 && (
          <View style={styles.computedRow}>
            <Text style={styles.computedLabel}>Sumatoria de pliegues (∑)</Text>
            <Text style={styles.computedValue}>{skinFoldsSum.toFixed(1)} mm</Text>
          </View>
        )}

        {/* PERÍMETROS CORPORALES */}
        <Text style={styles.sectionHeader}>PERÍMETROS CORPORALES (CIRCUNFERENCIAS)</Text>
        <InputFieldRow
          label="Cuello"
          value={formState.neck}
          onChangeText={(v) => onChangeFormState('neck', v)}
          suffix="cm"
        />
        <InputFieldRow
          label="Hombros"
          value={formState.shoulders}
          onChangeText={(v) => onChangeFormState('shoulders', v)}
          suffix="cm"
        />
        <InputFieldRow
          label="Pecho / Tórax"
          value={formState.chest}
          onChangeText={(v) => onChangeFormState('chest', v)}
          suffix="cm"
        />
        <InputFieldRow
          label="Cintura"
          value={formState.waist}
          onChangeText={(v) => onChangeFormState('waist', v)}
          suffix="cm"
        />
        <InputFieldRow
          label="Abdomen umbilical"
          value={formState.abdomen}
          onChangeText={(v) => onChangeFormState('abdomen', v)}
          suffix="cm"
        />
        <InputFieldRow
          label="Cadera / Glúteos"
          value={formState.hip}
          onChangeText={(v) => onChangeFormState('hip', v)}
          suffix="cm"
        />
        
        {/* Extremidades bilaterales */}
        <Text style={styles.subGroupLabel}>Bíceps relajado</Text>
        <View style={styles.dualInputRow}>
          <View style={{ flex: 1 }}>
            <InputFieldRow
              label="Der."
              value={formState.armRight}
              onChangeText={(v) => onChangeFormState('armRight', v)}
              suffix="cm"
            />
          </View>
          <View style={{ flex: 1 }}>
            <InputFieldRow
              label="Izq."
              value={formState.armLeft}
              onChangeText={(v) => onChangeFormState('armLeft', v)}
              suffix="cm"
            />
          </View>
        </View>

        <Text style={styles.subGroupLabel}>Bíceps contraído</Text>
        <View style={styles.dualInputRow}>
          <View style={{ flex: 1 }}>
            <InputFieldRow
              label="Der."
              value={formState.armFlexedRight}
              onChangeText={(v) => onChangeFormState('armFlexedRight', v)}
              suffix="cm"
            />
          </View>
          <View style={{ flex: 1 }}>
            <InputFieldRow
              label="Izq."
              value={formState.armFlexedLeft}
              onChangeText={(v) => onChangeFormState('armFlexedLeft', v)}
              suffix="cm"
            />
          </View>
        </View>

        <Text style={styles.subGroupLabel}>Antebrazo</Text>
        <View style={styles.dualInputRow}>
          <View style={{ flex: 1 }}>
            <InputFieldRow
              label="Der."
              value={formState.forearmRight}
              onChangeText={(v) => onChangeFormState('forearmRight', v)}
              suffix="cm"
            />
          </View>
          <View style={{ flex: 1 }}>
            <InputFieldRow
              label="Izq."
              value={formState.forearmLeft}
              onChangeText={(v) => onChangeFormState('forearmLeft', v)}
              suffix="cm"
            />
          </View>
        </View>

        <Text style={styles.subGroupLabel}>Muslo</Text>
        <View style={styles.dualInputRow}>
          <View style={{ flex: 1 }}>
            <InputFieldRow
              label="Der."
              value={formState.thighRight}
              onChangeText={(v) => onChangeFormState('thighRight', v)}
              suffix="cm"
            />
          </View>
          <View style={{ flex: 1 }}>
            <InputFieldRow
              label="Izq."
              value={formState.thighLeft}
              onChangeText={(v) => onChangeFormState('thighLeft', v)}
              suffix="cm"
            />
          </View>
        </View>

        <Text style={styles.subGroupLabel}>Pantorrilla</Text>
        <View style={styles.dualInputRow}>
          <View style={{ flex: 1 }}>
            <InputFieldRow
              label="Der."
              value={formState.calfRight}
              onChangeText={(v) => onChangeFormState('calfRight', v)}
              suffix="cm"
            />
          </View>
          <View style={{ flex: 1 }}>
            <InputFieldRow
              label="Izq."
              value={formState.calfLeft}
              onChangeText={(v) => onChangeFormState('calfLeft', v)}
              suffix="cm"
            />
          </View>
        </View>

        {/* PLICOMETRÍA (PLIEGUES CUTÁNEOS) */}
        <Text style={styles.sectionHeader}>PLICOMETRÍA (PLIEGUES CUTÁNEOS)</Text>
        <InputFieldRow
          label="Tríceps"
          value={formState.triceps}
          onChangeText={(v) => onChangeFormState('triceps', v)}
          suffix="mm"
        />
        <InputFieldRow
          label="Bíceps"
          value={formState.biceps}
          onChangeText={(v) => onChangeFormState('biceps', v)}
          suffix="mm"
        />
        <InputFieldRow
          label="Subescapular"
          value={formState.subscapular}
          onChangeText={(v) => onChangeFormState('subscapular', v)}
          suffix="mm"
        />
        <InputFieldRow
          label="Supraespinal"
          value={formState.supraspinal}
          onChangeText={(v) => onChangeFormState('supraspinal', v)}
          suffix="mm"
        />
        <InputFieldRow
          label="Suprailíaco"
          value={formState.suprailiac}
          onChangeText={(v) => onChangeFormState('suprailiac', v)}
          suffix="mm"
        />
        <InputFieldRow
          label="Abdominal"
          value={formState.abdominal}
          onChangeText={(v) => onChangeFormState('abdominal', v)}
          suffix="mm"
        />
        <InputFieldRow
          label="Muslo frontal"
          value={formState.thighSkin}
          onChangeText={(v) => onChangeFormState('thighSkin', v)}
          suffix="mm"
        />
        <InputFieldRow
          label="Pantorrilla medial"
          value={formState.calfSkin}
          onChangeText={(v) => onChangeFormState('calfSkin', v)}
          suffix="mm"
        />
        <InputFieldRow
          label="Pectoral / Pecho"
          value={formState.chestSkin}
          onChangeText={(v) => onChangeFormState('chestSkin', v)}
          suffix="mm"
        />

        <Text style={styles.hint}>
          Se guardará como una nueva medición completa en el historial del cliente.
        </Text>
      </View>
    );
  }

  // MODO LECTURA LIMPIA
  return (
    <View style={styles.container}>
      {/* COMPOSICIÓN CORPORAL */}
      <Text style={styles.sectionHeader}>COMPOSICIÓN CORPORAL</Text>
      <Row label="Peso" value={fmt(measurement?.weight_kg, 'kg', 1)} />
      <Row
        label="Estatura"
        value={measurement?.height_cm != null ? `${(measurement.height_cm / 100).toFixed(2)} m (${measurement.height_cm} cm)` : '—'}
      />
      <Row
        label="Porcentaje de grasa"
        value={measurement?.body_fat_pct != null ? `${measurement.body_fat_pct}%` : '—'}
      />
      <Row
        label="Masa muscular"
        value={measurement?.muscle_mass_pct != null ? `${measurement.muscle_mass_pct}%` : '—'}
      />
      <Row
        label="Grasa visceral"
        value={measurement?.visceral_fat != null ? `${measurement.visceral_fat}` : '—'}
      />
      <Row
        label="Metabolismo basal (BMR)"
        value={measurement?.bmr_kcal != null ? `${measurement.bmr_kcal} kcal` : '—'}
      />

      {/* RATIOS E INDICADORES */}
      <Text style={styles.sectionHeader}>INDICADORES Y RATIOS</Text>
      <Row
        label="Índice de masa corporal (IMC)"
        value={measurement?.bmi != null ? measurement.bmi.toFixed(1) : '—'}
      />
      <Row
        label="Relación cintura/cadera"
        value={measurement?.waist_hip_ratio != null ? measurement.waist_hip_ratio.toFixed(2) : '—'}
      />

      {/* PERÍMETROS CORPORALES */}
      <Text style={styles.sectionHeader}>PERÍMETROS CORPORALES</Text>
      <Row label="Cuello" value={fmt(measurement?.neck_cm, 'cm')} />
      <Row label="Hombros" value={fmt(measurement?.shoulders_cm, 'cm')} />
      <Row label="Pecho / Tórax" value={fmt(measurement?.chest_cm, 'cm')} />
      <Row label="Cintura" value={fmt(measurement?.waist_cm, 'cm')} />
      <Row label="Abdomen umbilical" value={fmt(measurement?.abdomen_cm, 'cm')} />
      <Row label="Cadera / Glúteos" value={fmt(measurement?.hip_cm, 'cm')} />
      
      {/* Extremidades */}
      <Row
        label="Bíceps relajado"
        value={
          measurement?.arm_right_cm != null || measurement?.arm_left_cm != null
            ? `Der: ${fmt(measurement?.arm_right_cm, 'cm')} · Izq: ${fmt(measurement?.arm_left_cm, 'cm')}`
            : fmt(measurement?.arm_cm, 'cm')
        }
      />
      {(measurement?.arm_flexed_right_cm != null || measurement?.arm_flexed_left_cm != null) && (
        <Row
          label="Bíceps contraído"
          value={`Der: ${fmt(measurement?.arm_flexed_right_cm, 'cm')} · Izq: ${fmt(measurement?.arm_flexed_left_cm, 'cm')}`}
        />
      )}
      {(measurement?.forearm_right_cm != null || measurement?.forearm_left_cm != null) && (
        <Row
          label="Antebrazo"
          value={`Der: ${fmt(measurement?.forearm_right_cm, 'cm')} · Izq: ${fmt(measurement?.forearm_left_cm, 'cm')}`}
        />
      )}
      {(measurement?.thigh_right_cm != null || measurement?.thigh_left_cm != null) && (
        <Row
          label="Muslo"
          value={`Der: ${fmt(measurement?.thigh_right_cm, 'cm')} · Izq: ${fmt(measurement?.thigh_left_cm, 'cm')}`}
        />
      )}
      {(measurement?.calf_right_cm != null || measurement?.calf_left_cm != null) && (
        <Row
          label="Pantorrilla"
          value={`Der: ${fmt(measurement?.calf_right_cm, 'cm')} · Izq: ${fmt(measurement?.calf_left_cm, 'cm')}`}
        />
      )}

      {/* PLICOMETRÍA */}
      <Text style={styles.sectionHeader}>PLICOMETRÍA (PLIEGUES)</Text>
      <Row label="Tríceps" value={fmt(measurement?.triceps_mm, 'mm')} />
      <Row label="Bíceps" value={fmt(measurement?.biceps_mm, 'mm')} />
      <Row label="Subescapular" value={fmt(measurement?.subscapular_mm, 'mm')} />
      <Row label="Supraespinal" value={fmt(measurement?.supraspinal_mm, 'mm')} />
      <Row label="Suprailíaco" value={fmt(measurement?.suprailiac_mm, 'mm')} />
      <Row label="Abdominal" value={fmt(measurement?.abdominal_mm, 'mm')} />
      <Row label="Muslo frontal" value={fmt(measurement?.thigh_mm, 'mm')} />
      <Row label="Pantorrilla medial" value={fmt(measurement?.calf_mm, 'mm')} />
      <Row label="Pectoral / Pecho" value={fmt(measurement?.chest_mm, 'mm')} />

      <Text style={styles.updatedAt}>
        {measurement != null
          ? `Última actualización: ${formatDateShort(measurement.measured_at)}`
          : 'Sin mediciones registradas todavía.'}
      </Text>

      {measurement != null && (
        <Pressable onPress={onViewHistory}>
          <Text style={styles.historyLink}>Ver historial completo ›</Text>
        </Pressable>
      )}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: s(16),
    gap: s(7),
  },
  sectionHeader: {
    fontFamily: fonts.headingSemi,
    fontSize: fontSizes.label,
    color: colors.navy,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: s(8),
    marginBottom: s(1),
  },
  subGroupLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: s(9),
    color: colors.textSecondary,
    marginTop: s(3),
  },
  dualInputRow: {
    flexDirection: 'row',
    gap: s(8),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
    backgroundColor: colors.surface,
    borderRadius: radius.input,
    paddingVertical: s(7),
    paddingHorizontal: s(9),
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowLabel: { flex: 1, fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.text },
  rowValue: { fontFamily: fonts.bodyBold, fontSize: fontSizes.xs, color: colors.text },
  computedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FCF3',
    borderRadius: radius.input,
    paddingVertical: s(7),
    paddingHorizontal: s(9),
    borderWidth: 1,
    borderColor: colors.lime,
  },
  computedLabel: {
    flex: 1,
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.xs,
    color: colors.navy,
  },
  computedValue: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.xs,
    color: colors.navy,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    color: colors.textMuted,
    marginTop: s(4),
  },
  updatedAt: {
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    color: colors.textMuted,
    marginTop: s(6),
  },
  historyLink: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.xs,
    color: colors.success,
    textAlign: 'right',
  },
});
