import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import { Pencil } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { friendlyError } from '@/lib/errors';
import { Button } from '@/components/ui/Button';
import { AppBackground } from '@/components/ui/AppBackground';
import { Input } from '@/components/ui/Input';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { AiQuotaCard } from '@/features/ai/components/AiQuotaCard';
import { useAiQuota } from '@/features/ai/quota';
import { useAuth } from '@/features/auth/useAuth';
import {
  getMyProfile,
  updateMyProfile,
  uploadMyLogo,
} from '@/features/profile/repository';
import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes, lineHeights } from '@/theme/typography';

/**
 * Pantalla Perfil:
 * - Avatar circular con botón flotante de lápiz (Pencil) para subir o cambiar foto.
 * - Campos: Nombre, Correo, Marca (antes Negocio), y Descripción personal/profesional.
 * - Botón "Guardar cambios".
 */
export default function ProfileScreen() {
  const router = useRouter();
  const signOut = useAuth((st) => st.signOut);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [certification, setCertification] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const quota = useAiQuota((st) => st.quota);
  const refreshQuota = useAiQuota((st) => st.refresh);

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    refreshQuota();
    getMyProfile()
      .then((profile) => {
        if (cancelled) return;
        setFullName(profile.full_name);
        setEmail(profile.email);
        setBusinessName(profile.business_name ?? '');
        setCertification(profile.certification ?? '');
        setDescription(profile.description ?? '');
        setLogoUrl(profile.logo_url);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(friendlyError(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshQuota]);

  useFocusEffect(load);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await updateMyProfile({
        full_name: fullName,
        business_name: businessName || null,
        certification: certification || null,
        description: description || null,
      });
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleUploadLogo() {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Necesitas dar permiso para acceder a tus fotos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;

    setUploading(true);
    try {
      const uploadedUrl = await uploadMyLogo(result.assets[0].uri);
      await updateMyProfile({
        full_name: fullName,
        business_name: businessName || null,
        certification: certification || null,
        description: description || null,
        logo_url: uploadedUrl,
      });
      setLogoUrl(uploadedUrl);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setUploading(false);
    }
  }

  return (
    <View style={styles.screen}>
      <AppBackground />
      <ScreenHeader title="Perfil" />

      {loading ? (
        <ActivityIndicator style={styles.spinner} color={colors.navy} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.contentWrap}>
            {/* Avatar con botón de lápiz superpuesto */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cambiar foto de perfil"
              onPress={handleUploadLogo}
              disabled={uploading}
              style={styles.avatarWrapper}
            >
              <View style={styles.avatar}>
                {logoUrl != null ? (
                  <Image
                    source={{ uri: logoUrl }}
                    style={styles.avatarImage}
                    contentFit="cover"
                  />
                ) : (
                  <Text style={styles.avatarText}>Foto</Text>
                )}
              </View>

              <View style={styles.editBadge}>
                {uploading ? (
                  <ActivityIndicator size="small" color={colors.surface} />
                ) : (
                  <Pencil size={s(12)} color={colors.surface} strokeWidth={2.5} />
                )}
              </View>
            </Pressable>

            <View style={styles.form}>
              <Input label="Nombre" value={fullName} onChangeText={setFullName} />
              <Input label="Correo" value={email} editable={false} />
              <Input
                label="Marca"
                placeholder="Nombre de tu marca"
                value={businessName}
                onChangeText={setBusinessName}
              />
              <Input
                label="Certificación (aparece en tus informes)"
                placeholder="Ej: Antropometrista ISAK nivel 1"
                value={certification}
                onChangeText={setCertification}
                maxLength={120}
              />
              <Text style={styles.certHint}>
                Lo declaras tú: CoplanFit no la verifica. Escribe solo una acreditación que tengas vigente; eres responsable de que sea cierta.
              </Text>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Descripción</Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={3}
                  placeholder="Escribe una breve descripción sobre ti, experiencia, especialidades…"
                  placeholderTextColor={colors.textMuted}
                  style={styles.descriptionInput}
                />
              </View>
            </View>

            {quota ? <AiQuotaCard quota={quota} /> : null}
          </View>

          <View style={styles.footerWrap}>
            {error != null && <Text style={styles.error}>{error}</Text>}
            <Button
              title="Guardar cambios"
              onPress={handleSave}
              loading={saving}
              style={styles.cta}
            />
            <Pressable accessibilityRole="button" onPress={() => router.push('/privacy' as never)} style={styles.signOut}>
              <Text style={styles.importText}>Privacidad y uso de datos ›</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => router.push('/client/import')} style={styles.signOut}>
              <Text style={styles.importText}>Importar clientes desde Excel ›</Text>
            </Pressable>
            <Pressable onPress={signOut} hitSlop={8} style={styles.signOut}>
              <Text style={styles.signOutText}>Cerrar sesión</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  certHint: { fontFamily: fonts.body, fontSize: fontSizes.xs, lineHeight: lineHeights.xs, color: colors.textSecondary, marginTop: -s(4) },
  importText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.navy },
  screen: { flex: 1, backgroundColor: colors.background },
  spinner: { marginTop: s(24) },
  body: {
    flexGrow: 1,
    padding: s(16),
    justifyContent: 'space-between',
    paddingBottom: s(24),
  },
  contentWrap: {
    width: '100%',
    alignItems: 'center',
    gap: s(12),
  },
  footerWrap: {
    width: '100%',
    alignItems: 'center',
    gap: s(8),
    marginTop: s(16),
  },
  avatarWrapper: {
    position: 'relative',
    marginTop: s(4),
    marginBottom: s(4),
  },
  avatar: {
    width: s(72),
    height: s(72),
    borderRadius: s(36),
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.xs,
    color: colors.textMuted,
  },
  editBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: s(24),
    height: s(24),
    borderRadius: s(12),
    backgroundColor: colors.navy,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: {
    width: '100%',
    gap: s(8),
  },
  fieldGroup: {
    gap: s(3),
  },
  fieldLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  descriptionInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    padding: s(8),
    minHeight: s(60),
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.text,
    textAlignVertical: 'top',
  },
  error: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.sm,
    color: colors.danger,
  },
  cta: { marginTop: s(4), width: '100%' },
  signOut: { marginTop: s(0), padding: s(8) },
  signOutText: {
    fontFamily: fonts.bodySemi,
    fontSize: fontSizes.sm,
    color: colors.danger,
  },
});

