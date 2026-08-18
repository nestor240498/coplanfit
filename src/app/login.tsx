import { Link } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
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

const bgVideoSource = require('../../assets/videos/bg1.mp4');

/**
 * Login con fondo de video dinámico en loop, header navy centrado
 * y formulario con inputs estilizados.
 */
export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const signIn = useAuth((st) => st.signIn);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const player = useVideoPlayer(bgVideoSource, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

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
      {/* Video de fondo a pantalla completa absoluto */}
      <View style={styles.videoBackgroundContainer} pointerEvents="none">
        {Platform.OS === 'web' ? (
          <video
            src={typeof bgVideoSource === 'string' ? bgVideoSource : bgVideoSource.uri || bgVideoSource}
            autoPlay
            loop
            muted
            playsInline
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              zIndex: 0,
            }}
          />
        ) : (
          <VideoView
            player={player}
            style={styles.videoPlayer}
            contentFit="cover"
            nativeControls={false}
          />
        )}
        {/* Capa de oscurecimiento y gradiente para contraste profesional */}
        <View style={styles.videoOverlay} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + s(16),
            paddingBottom: insets.bottom + s(24),
          },
        ]}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        <View style={styles.centerContainer}>
          <View style={styles.hero}>
            <CoplanFitLogo variant="on-navy" size="xs" />
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
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.navy, position: 'relative' },
  videoBackgroundContainer: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
    zIndex: 0,
  },
  videoPlayer: {
    ...StyleSheet.absoluteFill,
  },
  videoOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(18, 32, 61, 0.72)',
    zIndex: 1,
  },
  scroll: {
    flex: 1,
    zIndex: 2,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  centerContainer: {
    width: '100%',
    maxWidth: s(360),
    alignSelf: 'center',
    paddingHorizontal: s(20),
  },
  hero: {
    backgroundColor: 'transparent',
    paddingBottom: s(20),
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(4),
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.title,
    color: colors.surface,
    marginTop: s(6),
    textAlign: 'center',
  },
  form: {
    paddingVertical: s(10),
    gap: s(10),
  },
  // El login usa inputs más altos que los formularios (mockup: 42px, radio 10)
  loginInput: {
    height: s(42),
    borderRadius: s(10),
    paddingHorizontal: s(12),
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  error: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.sm,
    color: '#FF6B6B',
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
    marginTop: s(10),
  },
  footerText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  footerLink: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.sm,
    color: colors.lime,
  },
});
