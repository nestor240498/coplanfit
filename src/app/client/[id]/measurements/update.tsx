import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { InputFieldRow } from '@/components/ui/FieldRow';
import { createMeasurement, getLatestMeasurement } from '@/features/clients/measurementsRepository';
import { s } from '@/theme/scale';
import { colors, radius, spacing } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

/**
 * Mockup ("Actualizar medición"): sin flecha "‹" — se sale con Cancelar/Guardar.
 * Todos los campos en modo edición (fondo lima claro); al guardar crea entrada nueva
 * en el histórico (append-only). IMC y cintura/cadera se recalculan server-side.
 */
export default function UpdateMeasurementScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [height, setHeight] = useState('');
  const [waist, setWaist] = useState('');
  const [hip, setHip] = useState('');
  const [arm, setArm] = useState('');
  const [triceps, setTriceps] = useState('');
  const [abdominal, setAbdominal] = useState('');
  const [subscapular, setSubscapular] = useState('');

  useEffect(() => {
    getLatestMeasurement(id)
      .then((m) => {
        if (m == null) return;
        setWeight(m.weight_kg != null ? String(m.weight_kg) : '');
        setBodyFat(m.body_fat_pct != null ? String(m.body_fat_pct) : '');
        setHeight(m.height_cm != null ? (m.height_cm / 100).toFixed(2) : '');
        setWaist(m.waist_cm != null ? String(m.waist_cm) : '');
        setHip(m.hip_cm != null ? String(m.hip_cm) : '');
        setArm(m.arm_cm != null ? String(m.arm_cm) : '');
        setTriceps(m.triceps_mm != null ? String(m.triceps_mm) : '');
        setAbdominal(m.abdominal_mm != null ? String(m.abdominal_mm) : '');
        setSubscapular(m.subscapular_mm != null ? String(m.subscapular_mm) : '');
      })
      .finally(() => setLoading(false));
  }, [id]);

  function num(v: string): number | null {
    const parsed = Number(v.replace(',', '.'));
    return v.trim() === '' || Number.isNaN(parsed) ? null : parsed;
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await createMeasurement(id, {
        weight_kg: num(weight),
        body_fat_pct: num(bodyFat),
        height_cm: num(height) != null ? num(height)! * 100 : null,
        waist_cm: num(waist),
        hip_cm: num(hip),
        arm_cm: num(arm),
        triceps_mm: num(triceps),
        abdominal_mm: num(abdominal),
        subscapular_mm: num(subscapular),
      });
      router.back();
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  if (loading) return null;

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + s(12) }]}>
        <Text style={styles.title}>Actualizar medición</Text>
        <Text style={styles.subtitle}>Se guardará como nueva entrada en el historial</Text>
      </View>

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <InputFieldRow label="Peso" value={weight} onChangeText={setWeight} suffix="kg" />
        <InputFieldRow label="Porcentaje de grasa" value={bodyFat} onChangeText={setBodyFat} suffix="%" />
        <InputFieldRow label="Estatura" value={height} onChangeText={setHeight} suffix="m" />

        <Text style={styles.groupLabel}>Medición corporal</Text>
        <InputFieldRow label="Cintura" value={waist} onChangeText={setWaist} suffix="cm" />
        <InputFieldRow label="Cadera" value={hip} onChangeText={setHip} suffix="cm" />
        <InputFieldRow label="Brazo" value={arm} onChangeText={setArm} suffix="cm" />

        <Text style={styles.groupLabel}>Plicometría</Text>
        <InputFieldRow label="Tríceps" value={triceps} onChangeText={setTriceps} suffix="mm" />
        <InputFieldRow label="Abdominal" value={abdominal} onChangeText={setAbdominal} suffix="mm" />
        <InputFieldRow label="Subescapular" value={subscapular} onChangeText={setSubscapular} suffix="mm" />

        <Text style={styles.hint}>Índice de masa corporal y relación cintura/cadera se recalculan automáticamente</Text>

        {error != null && <Text style={styles.error}>{error}</Text>}
      </ScrollView>

      {/* Footer fijo al pie de la pantalla */}
      <View style={[styles.footer]}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>Cancelar</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={handleSave}
          disabled={saving}
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        >
          <Text style={styles.saveText}>{saving ? 'Guardando…' : 'Guardar'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.navy,
    paddingHorizontal: s(20),
    paddingBottom: s(16),
    gap: s(4),
  },
  title: { fontFamily: fonts.heading, fontSize: fontSizes.screenTitle, color: colors.surface },
  subtitle: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.onNavyMuted },
  form: { padding: s(16), gap: s(6), paddingBottom: s(24) },
  groupLabel: {
    fontFamily: fonts.headingSemi,
    fontSize: fontSizes.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginTop: s(2),
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    color: colors.textMuted,
    marginTop: s(2),
  },
  error: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.sm,
    color: colors.danger,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: s(16),
    paddingTop: s(16),
    paddingBottom: s(20),
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelBtn: {
    flex: 1,
    height: s(40),
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { fontFamily: fonts.bodyBold, fontSize: s(9), color: colors.textSecondary },
  saveBtn: {
    flex: 1,
    height: s(40),
    borderRadius: radius.button,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveText: { fontFamily: fonts.bodyBold, fontSize: s(9), color: colors.navy },
});
