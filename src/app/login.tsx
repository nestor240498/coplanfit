import { Link } from 'expo-router';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react-native';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { CoplanFitLogo } from '@/components/ui/CoplanFitLogo';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/features/auth/useAuth';
import { isSupabaseConfigured } from '@/lib/supabase';
import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

/**
 * Mockup 1d (Login): header navy con logo CF 36px radio 10 y "Bienvenido de nuevo" 19px;
 * cuerpo con inputs 42px radio 10 con iconos, CTA lima 42px y footer "¿Eres nuevo? Crear cuenta" 11px.
 */
export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const signIn = useAuth((st) => st.signIn);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length > 0;

  async function handleSubmit() {
    if (!canSubmit || loading) return;
    setError(null);
    setLoading(true);
    const result = await signIn(email, password);
    setLoading(false);
    if (result.error) setError(result.error);
    // Con login correcto, el Stack.Protected del layout raíz redirige solo.
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        <View style={[styles.hero, { paddingTop: insets.top + s(26) }]}>
          <CoplanFitLogo variant="on-navy" size="lg" />
          <Text style={styles.title}>Bienvenido de nuevo</Text>
        </View>

        <View style={styles.form}>
          <Input
            placeholder="Correo electrónico"
            value={email}
            onChangeText={setEmail}
            leftIcon={<Mail size={s(15)} color={colors.textMuted} />}
            style={styles.loginInput}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
          />
          <Input
            placeholder="Contraseña"
            value={password}
            onChangeText={setPassword}
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
            style={styles.loginInput}
            secureTextEntry={!showPassword}
            autoComplete="password"
            textContentType="password"
            onSubmitEditing={handleSubmit}
            returnKeyType="go"
          />
          {error != null && <Text style={styles.error}>{error}</Text>}
          {!isSupabaseConfigured && (
            <Text style={styles.configWarning}>
              Falta configurar Supabase: copia .env.example a .env con la URL y anon key del proyecto.
            </Text>
          )}
          <Button title="Iniciar sesión" onPress={handleSubmit} disabled={!canSubmit} loading={loading} style={styles.cta} />
          <View style={styles.footer}>
            <Text style={styles.footerText}>¿Eres nuevo? </Text>
            <Link href="/register" asChild>
              <Pressable hitSlop={8}>
                <Text style={styles.footerLink}>Crear cuenta</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1 },
  hero: {
    backgroundColor: colors.navy,
    paddingHorizontal: s(20),
    paddingBottom: s(24),
    gap: s(6),
  },
  logoMark: {
    width: s(36),
    height: s(36),
    borderRadius: s(10),
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontFamily: fonts.heading,
    fontSize: s(14),
    color: colors.navy,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.title,
    color: colors.surface,
    marginTop: s(8),
  },
  form: {
    padding: s(20),
    gap: s(10),
  },
  // El login usa inputs más altos que los formularios (mockup: 42px, radio 10)
  loginInput: {
    height: s(42),
    borderRadius: s(10),
    paddingHorizontal: s(12),
  },
  error: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.sm,
    color: colors.danger,
  },
  configWarning: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.xs,
    color: colors.danger,
    backgroundColor: colors.dangerBg,
    borderRadius: radius.input,
    padding: s(12),
  },
  cta: { marginTop: s(8) },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: s(6),
  },
  footerText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  footerLink: {
    fontFamily: fonts.bodySemi,
    fontSize: fontSizes.sm,
    color: colors.navy,
  },
});
