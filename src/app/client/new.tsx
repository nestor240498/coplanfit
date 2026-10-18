import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { friendlyError } from '@/lib/errors';
import { AppBackground } from '@/components/ui/AppBackground';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { GoalPickerSheet } from '@/features/clients/components/GoalPickerSheet';
import { PhoneField } from '@/features/clients/components/PhoneField';
import { createClient } from '@/features/clients/repository';
import { CONSENT_METHODS, type ConsentMethod, Goal } from '@/features/clients/types';
import { SingleChoice } from '@/features/workouts/components/ExerciseFormControls';
import { formatGoal } from '@/lib/format';
import { DEFAULT_COUNTRY_PREFIX, joinPhone } from '@/lib/phone';
import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes, lineHeights } from '@/theme/typography';

/**
 * Mockup 1d (Nuevo cliente): nombre, correo/teléfono, fila Edad + Objetivo ("Elegir ▾"),
 * nota "Los demás datos… se completan luego" 10px, CTA "Crear cliente" anclado abajo.
 */
export default function NewClientScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [fullName, setFullName] = useState('');
  const [contact, setContact] = useState('');
  const [phonePrefix, setPhonePrefix] = useState(DEFAULT_COUNTRY_PREFIX);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [age, setAge] = useState('');
  const [goal, setGoal] = useState<Goal | null>(null);
  const [goalSheetOpen, setGoalSheetOpen] = useState(false);
  const [consent, setConsent] = useState<ConsentMethod | 'pendiente'>('pendiente');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const phone = joinPhone(phonePrefix, phoneNumber);
  const phoneError = phoneNumber.trim() && !phone ? 'Revisa el número: faltan o sobran dígitos.' : undefined;
  const canSubmit = fullName.trim().length > 1 && !phoneError;

  async function handleSubmit() {
    if (!canSubmit || loading) return;
    setError(null);
    setLoading(true);
    try {
      await createClient({
        full_name: fullName,
        contact: contact || undefined,
        phone,
        age: age ? Number(age) : undefined,
        goal: goal ?? undefined,
        consent_method: consent === 'pendiente' ? undefined : consent,
      });
      router.back();
    } catch (e) {
      setError(friendlyError(e));
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AppBackground />
      <ScreenHeader title="Nuevo cliente" showBack />
      <ScrollView contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + s(16) }]} keyboardShouldPersistTaps="handled">
        <Input label="Nombre completo" placeholder="Ej: Carlos Ruiz" value={fullName} onChangeText={setFullName} />
        <PhoneField
          prefix={phonePrefix}
          localNumber={phoneNumber}
          onChangePrefix={setPhonePrefix}
          onChangeLocalNumber={setPhoneNumber}
          error={phoneError}
        />
        <Input
          label="Correo u otro contacto"
          placeholder="Opcional"
          value={contact}
          onChangeText={setContact}
          autoCapitalize="none"
          keyboardType="email-address"
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

        <View style={styles.consentBox}>
          <Text style={styles.selectLabel}>Consentimiento para guardar y enviar sus datos de salud</Text>
          <SingleChoice<ConsentMethod | 'pendiente'>
            options={[{ id: 'pendiente', label: 'Aún no' }, ...CONSENT_METHODS]}
            value={consent}
            onChange={setConsent}
          />
          <Text style={styles.hint}>Cómo te lo dio el cliente. Es una declaración tuya y puedes registrarla después en su ficha.</Text>
        </View>

        <Text style={styles.hint}>
          Los demás datos (alergias, condiciones, medidas) se completan luego, en la ficha del cliente.
        </Text>

        {error != null && <Text style={styles.error}>{error}</Text>}

        <Pressable accessibilityRole="button" onPress={() => router.replace('/client/import')} style={styles.importLink}>
          <Text style={styles.importLinkText}>¿Tienes muchos clientes? Impórtalos desde Excel ›</Text>
        </Pressable>
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
  consentBox: { gap: s(8) },
  importLink: { minHeight: 44, justifyContent: 'center', alignSelf: 'center' },
  importLinkText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.navy },
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
    fontSize: fontSizes.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: s(2),
  },
  select: {
    minHeight: 44,
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
    lineHeight: lineHeights.xs,
    marginTop: s(2),
  },
  error: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.sm,
    color: colors.danger,
  },
  cta: { marginTop: 'auto' },
});
