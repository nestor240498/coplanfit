import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBackground } from '@/components/ui/AppBackground';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { GoalPickerSheet } from '@/features/clients/components/GoalPickerSheet';
import { createClient } from '@/features/clients/repository';
import { Goal } from '@/features/clients/types';
import { formatGoal } from '@/lib/format';
import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

/**
 * Mockup 1d (Nuevo cliente): nombre, correo/teléfono, fila Edad + Objetivo ("Elegir ▾"),
 * nota "Los demás datos… se completan luego" 10px, CTA "Crear cliente" anclado abajo.
 */
export default function NewClientScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [fullName, setFullName] = useState('');
  const [contact, setContact] = useState('');
  const [age, setAge] = useState('');
  const [goal, setGoal] = useState<Goal | null>(null);
  const [goalSheetOpen, setGoalSheetOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = fullName.trim().length > 1;

  async function handleSubmit() {
    if (!canSubmit || loading) return;
    setError(null);
    setLoading(true);
    try {
      await createClient({
        full_name: fullName,
        contact: contact || undefined,
        age: age ? Number(age) : undefined,
        goal: goal ?? undefined,
      });
      router.back();
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AppBackground />
      <ScreenHeader title="Nuevo cliente" showBack />
      <ScrollView contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + s(16) }]} keyboardShouldPersistTaps="handled">
        <Input label="Nombre completo" placeholder="Ej: Carlos Ruiz" value={fullName} onChangeText={setFullName} />
        <Input
          label="Correo o teléfono"
          placeholder="Opcional"
          value={contact}
          onChangeText={setContact}
          autoCapitalize="none"
        />

        <View style={styles.fieldRow}>
          <Input
            label="Edad"
            placeholder="—"
            value={age}
            onChangeText={(v) => setAge(v.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            maxLength={3}
            containerStyle={styles.flexField}
          />
          <View style={styles.flexField}>
            <Text style={styles.selectLabel}>Objetivo</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Elegir objetivo"
              onPress={() => setGoalSheetOpen(true)}
              style={styles.select}
            >
              <Text style={styles.selectValue}>{goal ? formatGoal(goal) : 'Elegir'} ▾</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.hint}>
          Los demás datos (alergias, condiciones, medidas) se completan luego, en la ficha del cliente.
        </Text>

        {error != null && <Text style={styles.error}>{error}</Text>}
      </ScrollView>

      {/* Footer fijo al pie de la pantalla */}
      <View style={styles.footer}>
        <Button
          title="Crear cliente"
          onPress={handleSubmit}
          disabled={!canSubmit}
          loading={loading}
          style={styles.cta}
        />
      </View>

      <GoalPickerSheet visible={goalSheetOpen} onClose={() => setGoalSheetOpen(false)} value={goal} onSelect={setGoal} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  form: {
    flexGrow: 1,
    padding: s(16),
    gap: s(8),
    paddingBottom: s(24),
  },
  footer: {
    paddingHorizontal: s(16),
    paddingTop: s(10),
    paddingBottom: s(14),
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: s(8),
  },
  flexField: { flex: 1 },
  selectLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: s(8.5),
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: s(2),
  },
  select: {
    height: s(32),
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: s(8),
    justifyContent: 'center',
  },
  selectValue: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.text,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    lineHeight: s(14),
    marginTop: s(2),
  },
  error: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.sm,
    color: colors.danger,
  },
  cta: { marginTop: 'auto' },
});
