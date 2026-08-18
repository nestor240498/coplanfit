import { useRouter } from 'expo-router';
import { Eye, EyeOff, Lock, Mail, User } from 'lucide-react-native';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppBackground } from '@/components/ui/AppBackground';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useAuth } from '@/features/auth/useAuth';
import { s } from '@/theme/scale';
import { colors, radius, spacing } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

export default function RegisterScreen() {
  const router = useRouter();
  const signUp = useAuth((s) => s.signUp);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);

  const passwordsMatch = password === confirmPassword;
  const canSubmit =
    fullName.trim().length > 1 &&
    email.trim().length > 3 &&
    password.length >= 6 &&
    confirmPassword.length >= 6 &&
    passwordsMatch;

  async function handleSubmit() {
    if (!passwordsMatch) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (!canSubmit || loading) return;
    setError(null);
    setLoading(true);
    const result = await signUp(fullName, email, password);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    // Si la confirmación por correo está activa en Supabase no hay sesión aún;
    // si está desactivada, Stack.Protected redirige solo a la app.
    setPendingConfirmation(true);
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title="Crear cuenta" subtitle="Tu cuenta de entrenador en CoplanFit" showBack />
      <View style={styles.body}>
        <AppBackground />

        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          {pendingConfirmation ? (
            <View style={styles.confirmBox}>
              <Text style={styles.confirmTitle}>Revisa tu correo</Text>
              <Text style={styles.confirmText}>
                Te enviamos un enlace de confirmación a {email.trim()}. Después de confirmarlo, inicia sesión.
              </Text>
              <Button title="Volver a iniciar sesión" onPress={() => router.back()} />
            </View>
          ) : (
            <>
              <Input
                label="Nombre completo"
                placeholder="Nombre completo"
                value={fullName}
                onChangeText={(v) => {
                  setFullName(v);
                  if (error) setError(null);
                }}
                leftIcon={<User size={s(15)} color={colors.textMuted} />}
              />
              <Input
                label="Correo electrónico"
                placeholder="tu@correo.com"
                value={email}
                onChangeText={(v) => {
                  setEmail(v);
                  if (error) setError(null);
                }}
                leftIcon={<Mail size={s(15)} color={colors.textMuted} />}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
              />
              <Input
                label="Contraseña"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChangeText={(v) => {
                  setPassword(v);
                  if (error) setError(null);
                }}
                leftIcon={<Lock size={s(15)} color={colors.textMuted} />}
                rightIcon={
                  <Pressable
                    onPress={() => setShowPassword((v) => !v)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showPassword ? (
                      <EyeOff size={s(15)} color={colors.textMuted} />
                    ) : (
                      <Eye size={s(15)} color={colors.textMuted} />
                    )}
                  </Pressable>
                }
                secureTextEntry={!showPassword}
                autoComplete="new-password"
              />
              <Input
                label="Confirmar contraseña"
                placeholder="Repite tu contraseña"
                value={confirmPassword}
                onChangeText={(v) => {
                  setConfirmPassword(v);
                  if (error) setError(null);
                }}
                leftIcon={<Lock size={s(15)} color={colors.textMuted} />}
                rightIcon={
                  <Pressable
                    onPress={() => setShowConfirmPassword((v) => !v)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={showConfirmPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={s(15)} color={colors.textMuted} />
                    ) : (
                      <Eye size={s(15)} color={colors.textMuted} />
                    )}
                  </Pressable>
                }
                secureTextEntry={!showConfirmPassword}
                autoComplete="new-password"
              />
              {confirmPassword.length > 0 && !passwordsMatch && (
                <Text style={styles.error}>Las contraseñas no coinciden</Text>
              )}
              {error != null && <Text style={styles.error}>{error}</Text>}
              <Button title="Crear cuenta" onPress={handleSubmit} disabled={!canSubmit} loading={loading} style={styles.cta} />
            </>
          )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.navy },
  body: {
    flex: 1,
    position: 'relative',
    backgroundColor: colors.background,
  },
  form: {
    padding: spacing.xl,
    gap: spacing.md,
  },
  error: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.sm,
    color: '#FF6B6B',
  },
  cta: { marginTop: spacing.sm },
  confirmBox: {
    backgroundColor: colors.successBg,
    borderRadius: radius.card,
    padding: spacing.xl,
    gap: spacing.md,
  },
  confirmTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.title,
    color: colors.success,
  },
  confirmText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
