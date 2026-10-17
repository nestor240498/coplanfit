import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Camera, ImagePlus, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { friendlyError } from '@/lib/errors';
import { AppBackground } from '@/components/ui/AppBackground';
import { InputFieldRow } from '@/components/ui/FieldRow';
import { createMeasurement, getLatestMeasurement, uploadMeasurementPhotos } from '@/features/clients/measurementsRepository';
import { s } from '@/theme/scale';
import { colors, radius, spacing } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

/**
 * Mockup ("Actualizar medición"): sin flecha "‹" — se sale con Cancelar/Guardar.
 * Todos los campos en modo edición (fondo lima claro); al guardar crea entrada nueva
 * en el histórico (append-only) con sus fotos asociadas. IMC y cintura/cadera se recalculan server-side.
 */
export default function UpdateMeasurementScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingStatus, setSavingStatus] = useState<string | null>(null);
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

  // Fotos de progreso para esta medición
  const [photos, setPhotos] = useState<string[]>([]);

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

  async function handlePickImage(source: 'camera' | 'library') {
    try {
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permiso requerido', 'Se requiere acceso a la cámara para tomar fotos de progreso.');
          return;
        }
        const result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          quality: 0.85,
        });
        if (!result.canceled && result.assets && result.assets[0]?.uri) {
          setPhotos((prev) => [...prev, result.assets[0].uri]);
        }
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permiso requerido', 'Se requiere acceso a tus fotos para seleccionarlas.');
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsMultipleSelection: true,
          quality: 0.85,
        });
        if (!result.canceled && result.assets && result.assets.length > 0) {
          const newUris = result.assets.map((a) => a.uri).filter(Boolean);
          setPhotos((prev) => [...prev, ...newUris]);
        }
      }
    } catch (err) {
      Alert.alert('Error al seleccionar imagen', friendlyError(err));
    }
  }

  function handleRemovePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const uploadedUrls = await uploadMeasurementPhotos(id, photos, (current, total) =>
        setSavingStatus(`Subiendo foto ${current} de ${total}…`)
      );

      setSavingStatus('Guardando medición…');
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
        photos: uploadedUrls.length > 0 ? uploadedUrls : undefined,
      });
      router.back();
    } catch (e) {
      setError(friendlyError(e));
      setSaving(false);
      setSavingStatus(null);
    }
  }

  if (loading) return null;

  return (
    <View style={styles.screen}>
      <AppBackground />
      <View style={[styles.header, { paddingTop: insets.top + s(12) }]}>
        <Text style={styles.title}>Actualizar medición</Text>
        <Text style={styles.subtitle}>Se guardará como nueva entrada en el historial con sus fotos</Text>
      </View>

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        {/* Sección de Fotos de Progreso */}
        <View style={styles.photosSection}>
          <View style={styles.photosHeader}>
            <View style={styles.photosHeaderTexts}>
              <Text style={styles.groupLabel}>Fotos de progreso físico</Text>
              <Text style={styles.photosSubtitle}>
                Adjunta fotos (Frontal, Perfil, Espalda) para comparar la evolución visual
              </Text>
            </View>
            <View style={styles.photosCountBadge}>
              <Text style={styles.photosCountText}>{photos.length} {photos.length === 1 ? 'foto' : 'fotos'}</Text>
            </View>
          </View>

          {/* Botones de captura / selección */}
          <View style={styles.photoActionsRow}>
            <Pressable
              onPress={() => handlePickImage('camera')}
              disabled={saving}
              style={styles.photoActionBtn}
            >
              <Camera size={s(14)} color={colors.navy} />
              <Text style={styles.photoActionBtnText}>Tomar Foto</Text>
            </Pressable>
            <Pressable
              onPress={() => handlePickImage('library')}
              disabled={saving}
              style={[styles.photoActionBtn, styles.photoActionBtnSecondary]}
            >
              <ImagePlus size={s(14)} color={colors.navy} />
              <Text style={styles.photoActionBtnText}>Galería</Text>
            </Pressable>
          </View>

          {/* Galería de miniaturas seleccionadas */}
          {photos.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbnailsRow}
            >
              {photos.map((uri, idx) => (
                <View key={`${idx}-${uri}`} style={styles.thumbnailCard}>
                  <Image source={{ uri }} style={styles.thumbnailImg} contentFit="cover" />
                  <View style={styles.thumbBadge}>
                    <Text style={styles.thumbBadgeText}>{idx + 1}</Text>
                  </View>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Quitar foto ${idx + 1}`}
                    onPress={() => handleRemovePhoto(idx)}
                    disabled={saving}
                    style={styles.thumbDeleteBtn}
                    hitSlop={12}
                  >
                    <Trash2 size={s(11)} color={colors.surface} />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyPhotosBox}>
              <Text style={styles.emptyPhotosText}>No has añadido fotos para esta medición todavía.</Text>
            </View>
          )}
        </View>

        <Text style={styles.groupLabel}>Composición corporal</Text>
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
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, s(16)) }]}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} disabled={saving} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>Cancelar</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={handleSave}
          disabled={saving}
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        >
          {saving ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: s(6) }}>
              <ActivityIndicator size="small" color={colors.navy} />
              <Text style={styles.saveText}>{savingStatus || 'Guardando…'}</Text>
            </View>
          ) : (
            <Text style={styles.saveText}>Guardar medición</Text>
          )}
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
  photosSection: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: s(12),
    borderWidth: 1,
    borderColor: colors.border,
    gap: s(10),
    marginBottom: s(6),
  },
  photosHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: s(8),
  },
  photosHeaderTexts: {
    flex: 1,
    paddingRight: s(4),
  },
  photosSubtitle: {
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    color: colors.textMuted,
    marginTop: 2,
  },
  photosCountBadge: {
    flexShrink: 0,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(139, 197, 63, 0.2)',
    paddingHorizontal: s(8),
    paddingVertical: 2,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: colors.lime,
  },
  photosCountText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.micro,
    color: colors.navy,
  },
  photoActionsRow: {
    flexDirection: 'row',
    gap: s(8),
  },
  photoActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(6),
    backgroundColor: colors.lime,
    paddingVertical: s(8),
    borderRadius: radius.input,
  },
  photoActionBtnSecondary: {
    backgroundColor: 'rgba(27, 42, 74, 0.06)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  photoActionBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.label,
    color: colors.navy,
  },
  thumbnailsRow: {
    gap: s(10),
    paddingVertical: s(4),
  },
  thumbnailCard: {
    width: s(72),
    height: s(96),
    borderRadius: radius.card,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  thumbnailImg: {
    width: '100%',
    height: '100%',
  },
  thumbBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: s(18),
    height: s(18),
    borderRadius: s(9),
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.micro,
    color: colors.surface,
  },
  thumbDeleteBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: s(20),
    height: s(20),
    borderRadius: s(10),
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPhotosBox: {
    paddingVertical: s(12),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: radius.input,
    backgroundColor: colors.background,
  },
  emptyPhotosText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    color: colors.textMuted,
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
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.label, color: colors.textSecondary },
  saveBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.button,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.label, color: colors.navy },
});
