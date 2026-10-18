import * as ImagePicker from 'expo-image-picker';
import { Camera, ChevronDown, ChevronUp, Download, ImagePlus, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { friendlyError } from '@/lib/errors';
import { AnalysisCard } from '@/features/anthropometry/components/AnalysisCard';
import { fmtEs } from '@/features/anthropometry/engine';
import { EvaluationsList } from '@/features/anthropometry/components/EvaluationsList';
import type { DraftSummary } from '@/features/anthropometry/draftStorage';
import { PhotoPreview, PhotoViewer } from '@/components/ui/PhotoViewer';
import { StorageImage } from '@/components/ui/StorageImage';
import { InputFieldRow } from '@/components/ui/FieldRow';
import { formatDateShort } from '@/lib/format';
import { buildMeasurementDocumentHtml } from '@/features/anthropometry/measurementDocument';
import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

import { DocumentToDeliver } from '../sentLogRepository';
import { IncludePhotosToggle } from './IncludePhotosToggle';
import { SendDocumentSheet } from './SendDocumentSheet';
import { Client, Measurement } from '../types';

export type MeasurementFormState = {
  // Fotos de progreso
  photos: string[];
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
  client: Client;
  measurement: Measurement | null;
  isEditing?: boolean;
  formState?: MeasurementFormState;
  onChangeFormState?: (key: keyof MeasurementFormState, value: any) => void;
  /** Medición ISAK / pliegues a medias en este dispositivo. */
  /** Todas las evaluaciones del cliente, la más reciente primero. */
  measurements?: Measurement[];
  draft?: DraftSummary | null;
  onResumeDraft?: () => void;
  onDiscardDraft?: () => void;
  onViewHistory: () => void;
  /** Abre el análisis completo de una medición. */
  onOpenAnalysis: (measurementId: string) => void;
  /** Tras enviar el reporte (refresca el historial de envíos). */
  onSent?: () => void;
};

export function AntropometriaTab({
  client,
  measurement,
  isEditing = false,
  formState,
  onChangeFormState,
  measurements = [],
  draft,
  onResumeDraft,
  onDiscardDraft,
  onViewHistory,
  onOpenAnalysis,
  onSent,
}: Props) {
  const [showMore, setShowMore] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [includePhotos, setIncludePhotos] = useState(false);
  const [selectedPreview, setSelectedPreview] = useState<PhotoPreview | null>(null);

  const measurementDocument: DocumentToDeliver | null = measurement
    ? {
        clientId: client.id,
        kind: 'medicion',
        refId: measurement.id,
        label: `Evaluación antropométrica del ${formatDateShort(measurement.measured_at)}`,
        buildHtml: () => buildMeasurementDocumentHtml({ client, measurement, includePhotos }),
      }
    : null;

  async function handlePickImage(source: 'camera' | 'library') {
    if (!formState || !onChangeFormState) return;
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
          const currentPhotos = formState.photos || [];
          onChangeFormState('photos', [...currentPhotos, result.assets[0].uri]);
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
          const currentPhotos = formState.photos || [];
          onChangeFormState('photos', [...currentPhotos, ...newUris]);
        }
      }
    } catch (err) {
      Alert.alert('Error al seleccionar imagen', friendlyError(err));
    }
  }

  function handleRemovePhoto(index: number) {
    if (!formState || !onChangeFormState) return;
    const currentPhotos = formState.photos || [];
    onChangeFormState(
      'photos',
      currentPhotos.filter((_, i) => i !== index)
    );
  }

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
    const currentPhotos = formState.photos || [];

    return (
      <View style={styles.container}>
        {/* SECCIÓN FOTOS DE PROGRESO */}
        <View style={styles.photosSection}>
          <View style={styles.photosHeader}>
            <View style={styles.photosHeaderTexts}>
              <Text style={styles.photosTitle}>Fotos de progreso físico</Text>
              <Text style={styles.photosSubtitle}>
                Adjunta fotos (Frontal, Perfil, Espalda) para comparar la evolución visual
              </Text>
            </View>
            <View style={styles.photosCountBadge}>
              <Text style={styles.photosCountText}>
                {currentPhotos.length} {currentPhotos.length === 1 ? 'foto' : 'fotos'}
              </Text>
            </View>
          </View>

          {/* Botones de acción */}
          <View style={styles.photoActionsRow}>
            <Pressable onPress={() => handlePickImage('camera')} style={styles.photoActionBtn}>
              <Camera size={s(14)} color={colors.navy} />
              <Text style={styles.photoActionBtnText}>Tomar Foto</Text>
            </Pressable>
            <Pressable
              onPress={() => handlePickImage('library')}
              style={[styles.photoActionBtn, styles.photoActionBtnSecondary]}
            >
              <ImagePlus size={s(14)} color={colors.navy} />
              <Text style={styles.photoActionBtnText}>Galería</Text>
            </Pressable>
          </View>

          {/* Miniaturas */}
          {currentPhotos.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbnailsRow}
            >
              {currentPhotos.map((uri, idx) => (
                <View key={`${idx}-${uri}`} style={styles.thumbnailCard}>
                  <StorageImage mediaRef={uri} style={styles.thumbnailImg} contentFit="cover" />
                  <View style={styles.thumbBadge}>
                    <Text style={styles.thumbBadgeText}>{idx + 1}</Text>
                  </View>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Quitar foto ${idx + 1}`}
                    onPress={() => handleRemovePhoto(idx)}
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

        {/* MEDIDAS BÁSICAS (cinta y báscula) */}
        <Text style={styles.sectionHeader}>MEDIDAS BÁSICAS</Text>
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
          label="Cintura"
          value={formState.waist}
          onChangeText={(v) => onChangeFormState('waist', v)}
          suffix="cm"
        />
        <InputFieldRow
          label="Cadera / Glúteos"
          value={formState.hip}
          onChangeText={(v) => onChangeFormState('hip', v)}
          suffix="cm"
        />
        <InputFieldRow
          label="Pecho / Tórax"
          value={formState.chest}
          onChangeText={(v) => onChangeFormState('chest', v)}
          suffix="cm"
        />
        <Text style={styles.subGroupLabel}>Brazo relajado</Text>
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

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: showMore }}
          onPress={() => setShowMore((v) => !v)}
          style={styles.moreToggle}
        >
          <Text style={styles.moreToggleText}>{showMore ? 'Menos medidas' : 'Más medidas (composición, perímetros, pliegues)'}</Text>
          {showMore ? <ChevronUp size={18} color={colors.navy} /> : <ChevronDown size={18} color={colors.navy} />}
        </Pressable>

        {showMore && (
          <>
        {/* COMPOSICIÓN CORPORAL */}
        <Text style={styles.sectionHeader}>COMPOSICIÓN CORPORAL</Text>
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
          label="Abdomen umbilical"
          value={formState.abdomen}
          onChangeText={(v) => onChangeFormState('abdomen', v)}
          suffix="cm"
        />
        
        {/* Extremidades bilaterales */}
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
          label="Cresta ilíaca"
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
          </>
        )}
      </View>
    );
  }

  // MODO LECTURA LIMPIA
  return (
    <View style={styles.container}>
      {draft ? (
        <View style={styles.draftCard}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Continuar la medición, ${draft.measured} de ${draft.total} medidas`}
            onPress={onResumeDraft}
            style={styles.draftMain}
          >
            <Text style={styles.draftTitle}>{draft.profile === 'skinfolds' ? 'Pliegues' : 'Evaluación ISAK'} a medias</Text>
            <Text style={styles.draftMeta}>
              {draft.measured} de {draft.total} medidas · Continuar ›
            </Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Descartar la medición a medias" onPress={onDiscardDraft} style={styles.draftDiscard}>
            <Trash2 size={20} color={colors.danger} />
          </Pressable>
        </View>
      ) : null}
      <EvaluationsList measurements={measurements} onOpen={onOpenAnalysis} onViewAll={onViewHistory} />

      {measurement != null && (
        <View style={styles.lastDataHeader}>
          <Text style={styles.lastDataTitle}>Datos de la última medición</Text>
          <Text style={styles.lastDataMeta}>{formatDateShort(measurement.measured_at)} · de la evaluación más reciente</Text>
        </View>
      )}
      {/* FOTOS DE PROGRESO DE LA MEDICIÓN ACTUAL (SI EXISTEN) */}
      {measurement?.photos && measurement.photos.length > 0 && (
        <View style={styles.photosReadSection}>
          <Text style={styles.sectionHeader}>FOTOS DE PROGRESO FÍSICO ({measurement.photos.length})</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.readPhotosScroll}
          >
            {measurement.photos.map((photoUrl, idx) => (
              <Pressable
                key={`read-photo-${idx}-${photoUrl}`}
                onPress={() =>
                  setSelectedPreview({
                    url: photoUrl,
                    title: `Foto de progreso ${idx + 1}`,
                    date: formatDateShort(measurement.measured_at),
                  })
                }
                style={styles.readPhotoCard}
              >
                <StorageImage mediaRef={photoUrl} style={styles.readPhotoImg} contentFit="cover" />
                <View style={styles.readPhotoBadge}>
                  <Text style={styles.readPhotoBadgeText}>{idx + 1}</Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {measurement != null &&
        dataGroups(measurement).map((group) => (
          <AnalysisCard key={group.title} title={group.title}>
            {group.rows.map((row, i) => (
              <View key={row.label} style={[styles.dataRow, i > 0 && styles.dataRowDivider]}>
                <Text style={styles.dataLabel}>{row.label}</Text>
                <Text style={styles.dataValue}>{row.value}</Text>
              </View>
            ))}
          </AnalysisCard>
        ))}

      <Text style={styles.updatedAt}>
        {measurement != null
          ? `Última actualización: ${formatDateShort(measurement.measured_at)}`
          : 'Sin mediciones registradas todavía.'}
      </Text>

      {measurement != null && (
        <View style={styles.actionsBar}>
          <Pressable accessibilityRole="button" onPress={() => setSendOpen(true)} style={styles.exportPdfBtn}>
            <Download size={s(12)} color="#3B6B11" strokeWidth={2.2} />
            <Text style={styles.exportPdfBtnText}>Enviar o descargar el reporte</Text>
          </Pressable>
        </View>
      )}

      <SendDocumentSheet
        visible={sendOpen}
        onClose={() => setSendOpen(false)}
        document={measurementDocument}
        clientName={client.full_name}
        clientPhone={client.phone}
        onSent={onSent}
      >
        {(measurement?.photos?.length ?? 0) > 0 && (
          <IncludePhotosToggle value={includePhotos} onChange={setIncludePhotos} />
        )}
      </SendDocumentSheet>

      <PhotoViewer preview={selectedPreview} onClose={() => setSelectedPreview(null)} />
    </View>
  );
}

type DataRowItem = { label: string; value: string };

const num = (v: number | null | undefined, decimals: number, unit: string): string | null =>
  v == null ? null : `${fmtEs(v, decimals)} ${unit}`;

/** «Der. 31,0 · Izq. 30,5 cm»; si solo hay un lado, solo ese. */
function sides(right: number | null | undefined, left: number | null | undefined, unit: string): string | null {
  if (right == null && left == null) return null;
  if (right != null && left != null) return `Der. ${fmtEs(right, 1)} · Izq. ${fmtEs(left, 1)} ${unit}`;
  return right != null ? `Der. ${fmtEs(right, 1)} ${unit}` : `Izq. ${fmtEs(left!, 1)} ${unit}`;
}

/** Datos de la medición en grupos; las filas sin dato no se muestran y un grupo vacío tampoco. */
function dataGroups(m: Measurement): { title: string; rows: DataRowItem[] }[] {
  const height = m.height_cm != null ? `${fmtEs(m.height_cm / 100, 2)} m (${fmtEs(m.height_cm, Number.isInteger(m.height_cm) ? 0 : 1)} cm)` : null;
  const groups: { title: string; rows: [string, string | null][] }[] = [
    {
      title: 'Composición corporal',
      rows: [
        ['Peso', num(m.weight_kg, 1, 'kg')],
        ['Estatura', height],
        ['Porcentaje de grasa', num(m.body_fat_pct, 1, '%')],
        ['Masa muscular', num(m.muscle_mass_pct, 1, '%')],
        ['Grasa visceral', m.visceral_fat != null ? fmtEs(m.visceral_fat, 0) : null],
        ['Metabolismo basal (BMR)', num(m.bmr_kcal, 0, 'kcal')],
        ['Índice de masa corporal (IMC)', m.bmi != null ? fmtEs(m.bmi, 1) : null],
        ['Relación cintura/cadera', m.waist_hip_ratio != null ? fmtEs(m.waist_hip_ratio, 2) : null],
      ],
    },
    {
      title: 'Perímetros',
      rows: [
        ['Cuello', num(m.neck_cm, 1, 'cm')],
        ['Hombros', num(m.shoulders_cm, 1, 'cm')],
        ['Pecho / Tórax', num(m.chest_cm, 1, 'cm')],
        ['Cintura', num(m.waist_cm, 1, 'cm')],
        ['Abdomen umbilical', num(m.abdomen_cm, 1, 'cm')],
        ['Cadera / Glúteos', num(m.hip_cm, 1, 'cm')],
        ['Bíceps relajado', sides(m.arm_right_cm, m.arm_left_cm, 'cm') ?? num(m.arm_cm, 1, 'cm')],
        ['Bíceps contraído', sides(m.arm_flexed_right_cm, m.arm_flexed_left_cm, 'cm')],
        ['Antebrazo', sides(m.forearm_right_cm, m.forearm_left_cm, 'cm')],
        ['Muslo', sides(m.thigh_right_cm, m.thigh_left_cm, 'cm')],
        ['Pantorrilla', sides(m.calf_right_cm, m.calf_left_cm, 'cm')],
      ],
    },
    {
      title: 'Pliegues cutáneos',
      rows: [
        ['Tríceps', num(m.triceps_mm, 1, 'mm')],
        ['Bíceps', num(m.biceps_mm, 1, 'mm')],
        ['Subescapular', num(m.subscapular_mm, 1, 'mm')],
        ['Supraespinal', num(m.supraspinal_mm, 1, 'mm')],
        ['Cresta ilíaca', num(m.suprailiac_mm, 1, 'mm')],
        ['Abdominal', num(m.abdominal_mm, 1, 'mm')],
        ['Muslo frontal', num(m.thigh_mm, 1, 'mm')],
        ['Pantorrilla medial', num(m.calf_mm, 1, 'mm')],
        ['Pectoral / Pecho', num(m.chest_mm, 1, 'mm')],
      ],
    },
  ];
  return groups
    .map((g) => ({ title: g.title, rows: g.rows.flatMap(([label, value]) => (value != null ? [{ label, value }] : [])) }))
    .filter((g) => g.rows.length > 0);
}

const styles = StyleSheet.create({
  container: {
    padding: s(16),
    gap: s(7),
  },
  photosSection: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: s(12),
    borderWidth: 1,
    borderColor: colors.border,
    gap: s(10),
    marginBottom: s(4),
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
  photosTitle: {
    fontFamily: fonts.headingSemi,
    fontSize: fontSizes.label,
    color: colors.navy,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
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
  photosReadSection: {
    marginBottom: s(4),
    gap: s(6),
  },
  readPhotosScroll: {
    gap: s(10),
    paddingVertical: s(4),
  },
  readPhotoCard: {
    width: s(80),
    height: s(106),
    borderRadius: radius.card,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  readPhotoImg: {
    width: '100%',
    height: '100%',
  },
  readPhotoBadge: {
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
  readPhotoBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.micro,
    color: colors.surface,
  },
  draftCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.card,
    backgroundColor: colors.lime,
  },
  draftMain: { flex: 1, minHeight: 64, justifyContent: 'center', gap: 2, paddingHorizontal: s(16), paddingVertical: s(10) },
  draftTitle: { fontFamily: fonts.bodyBold, fontSize: fontSizes.base, color: colors.navy },
  draftMeta: { fontFamily: fonts.bodySemi, fontSize: fontSizes.xs, color: colors.navy },
  draftDiscard: { width: 48, height: 48, margin: s(8), alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: colors.surface },
  lastDataHeader: { gap: 2, marginTop: s(16) },
  lastDataTitle: { fontFamily: fonts.heading, fontSize: fontSizes.headline, color: colors.navy },
  lastDataMeta: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textSecondary },
  dataRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: s(12), minHeight: 44 },
  dataRowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  dataLabel: { flexShrink: 1, fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.text },
  dataValue: { flexShrink: 1, textAlign: 'right', fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.navy },
  moreToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    marginTop: s(8),
  },
  moreToggleText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.navy },
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
    fontSize: fontSizes.label,
    color: colors.textSecondary,
    marginTop: s(3),
  },
  dualInputRow: {
    flexDirection: 'row',
    gap: s(8),
  },
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
  actionsBar: {
    flexDirection: 'column',
    gap: s(6),
    marginTop: s(4),
    paddingTop: s(8),
    borderTopWidth: 1,
    borderTopColor: colors.border,
    width: '100%',
  },
  exportPdfBtn: {
    width: '100%',
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(5),
    backgroundColor: '#F4FBEB',
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: '#D4ECC4',
  },
  exportPdfBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.xs,
    color: '#3B6B11',
  },
});
