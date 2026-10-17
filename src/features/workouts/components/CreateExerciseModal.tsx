import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Camera, CheckCircle2, Dumbbell, Globe, Plus, Sparkles, Trash2, Video, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { friendlyError } from '@/lib/errors';
import { hapticSuccess } from '@/lib/motion';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';
import { AiQuotaHint } from '@/features/ai/components/AiQuotaHint';
import { useAiQuota } from '@/features/ai/quota';

import { classifyExercise, generateExerciseAiDetails } from '../exerciseAiAssistant';
import { findSimilarExercises, matchesExerciseQuery } from '../exerciseSearch';
import {
  createExercise,
  getCurrentUserRole,
  updateExercise,
  uploadExerciseImage,
  uploadExerciseVideo,
} from '../exerciseService';
import {
  Exercise,
  EXERCISE_EQUIPMENT,
  EXERCISE_METRICS,
  EXERCISE_TYPES,
  ExerciseMetric,
  ExerciseType,
  equipmentLabel,
  exerciseTypeLabel,
  LATERALITIES,
  Laterality,
  metricLabel,
  MOVEMENT_PATTERNS,
  MovementPattern,
  MUSCLE_GROUPS,
  MuscleGroup,
  muscleLabel,
  TRAINING_LEVELS,
  TrainingLevel,
} from '../types';
import { ExerciseImageCarousel } from './ExerciseImageCarousel';
import { ExerciseVideo } from './ExerciseVideo';
import { FieldLabel, FormSection, MultiSelectField, SelectField, SingleChoice, TextListInput } from './ExerciseFormControls';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSaved: (exercise: Exercise) => void;
  /** Ejercicio a editar. */
  initialExercise?: Exercise | null;
  /** Valores iniciales para uno nuevo (crear variante o duplicar un oficial como propio). */
  template?: Partial<Exercise> | null;
  /** Banco actual: avisa de duplicados y permite elegir de qué ejercicio es variante. */
  existingExercises?: Exercise[];
};

type FormState = {
  name: string;
  description: string;
  muscleGroup: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
  equipment: string;
  extraEquipment: string[];
  difficulty: TrainingLevel;
  exerciseType: ExerciseType | null;
  metric: ExerciseMetric;
  laterality: Laterality;
  pattern: MovementPattern | null;
  steps: string[];
  tips: string;
  cues: string[];
  contraindications: string[];
  aliases: string[];
  parentId: string | null;
  images: string[];
  videoPath: string | null;
};

/** Convierte un texto de instrucciones ("1. … 2. …") en pasos individuales. */
function parseInstructionsToSteps(text?: string | null): string[] {
  if (!text || !text.trim()) return [];
  const rawParts = text
    .split(/(?:[\r\n]+|(?<=\s|^)(?=\d+[.)]\s))/g)
    .map((p) => p.replace(/^\d+[.)]\s*/, '').trim())
    .filter((p) => p.length > 0);
  return rawParts.length > 0 ? rawParts : [text.trim()];
}

function formFrom(ex: Partial<Exercise> | null | undefined): FormState {
  const images =
    Array.isArray(ex?.images) && ex.images.length > 0 ? ex.images : ex?.image_url ? [ex.image_url] : [];
  return {
    name: ex?.name ?? '',
    description: ex?.description ?? '',
    muscleGroup: ex?.muscle_group ?? 'pecho',
    secondaryMuscles: ex?.secondary_muscles ?? [],
    equipment: ex?.equipment ?? 'mancuernas',
    extraEquipment: ex?.extra_equipment ?? [],
    difficulty: ex?.difficulty ?? 'intermedio',
    exerciseType: ex?.exercise_type ?? null,
    metric: ex?.metric ?? 'reps_peso',
    laterality: ex?.laterality ?? 'bilateral',
    pattern: ex?.movement_pattern ?? null,
    steps: parseInstructionsToSteps(ex?.instructions),
    tips: ex?.tips ?? '',
    cues: ex?.cues ?? [],
    contraindications: ex?.contraindications ?? [],
    aliases: ex?.aliases ?? [],
    parentId: ex?.parent_id ?? null,
    images,
    videoPath: ex?.video_path ?? null,
  };
}

export function CreateExerciseModal({
  visible,
  onClose,
  onSaved,
  initialExercise,
  template,
  existingExercises = [],
}: Props) {
  const [form, setForm] = useState<FormState>(() => formFrom(initialExercise ?? template));
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const insets = useSafeAreaInsets();
  const [classifying, setClassifying] = useState(false);
  const quota = useAiQuota((st) => st.quota);
  const refreshQuota = useAiQuota((st) => st.refresh);
  const [classifyStage, setClassifyStage] = useState<'classify' | 'technique'>('classify');
  // Campos que rellenó la IA y el entrenador aún no ha cambiado (se marcan con «IA»)
  const [aiFields, setAiFields] = useState<ReadonlySet<keyof FormState>>(new Set());
  const [generatingTechnique, setGeneratingTechnique] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [parentQuery, setParentQuery] = useState('');
  const [saving, setSaving] = useState(false);

  const isEditing = Boolean(initialExercise);
  const touch = (key: keyof FormState) =>
    setAiFields((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    touch(key);
  };
  const ai = (key: keyof FormState) => aiFields.has(key);

  // Al abrir (o cambiar el ejercicio/plantilla) se reinicia el formulario durante el render,
  // el patrón recomendado por React en lugar de un efecto
  const [openedWith, setOpenedWith] = useState({ visible, initialExercise, template });
  if (
    openedWith.visible !== visible ||
    openedWith.initialExercise !== initialExercise ||
    openedWith.template !== template
  ) {
    setOpenedWith({ visible, initialExercise, template });
    if (visible) {
      setForm(formFrom(initialExercise ?? template));
      setAiFields(new Set());
      setActiveImageIndex(0);
      setParentQuery('');
    }
  }

  useEffect(() => {
    if (!visible) return;
    getCurrentUserRole().then((res) => setIsSuperAdmin(res.isSuperAdmin));
    refreshQuota();
  }, [visible, refreshQuota]);

  const selfId = initialExercise?.id;
  const similarExercises =
    !isEditing && form.name.trim().length >= 3 ? findSimilarExercises(form.name, existingExercises, selfId) : [];
  const parentExercise = existingExercises.find((ex) => ex.id === form.parentId) ?? null;
  const parentResults =
    parentQuery.trim().length >= 2
      ? existingExercises.filter((ex) => ex.id !== selfId && matchesExerciseQuery(ex, parentQuery)).slice(0, 5)
      : [];

  const classificationSummary = [
    muscleLabel(form.muscleGroup),
    equipmentLabel(form.equipment),
    exerciseTypeLabel(form.exerciseType),
    metricLabel(form.metric),
  ]
    .filter(Boolean)
    .join(' · ');
  const techniqueSummary =
    (form.steps.length + form.cues.length > 0
      ? `${form.steps.length} pasos · ${form.cues.length} indicaciones`
      : 'Sin técnica todavía') + (ai('cues') || ai('steps') ? ' · propuesto por IA' : '');
  const safetySummary =
    ([
      form.contraindications.length ? `${form.contraindications.length} contraindicaciones` : '',
      form.aliases.length ? `${form.aliases.length} sinónimos` : '',
    ]
      .filter(Boolean)
      .join(' · ') || 'Opcional') + (ai('contraindications') || ai('aliases') ? ' · propuesto por IA' : '');

  async function handleClassify() {
    if (form.name.trim().length < 3) return;
    setClassifying(true);
    setClassifyStage('classify');
    try {
      const proposal = await classifyExercise(form.name);
      // Lo que el entrenador ya escribió en las listas no se pisa
      const filled: (keyof FormState)[] = [
        'muscleGroup',
        'equipment',
        'exerciseType',
        'metric',
        'laterality',
        'pattern',
        'difficulty',
      ];
      if (!form.description.trim() && proposal.description) filled.push('description');
      if (proposal.secondary_muscles.length) filled.push('secondaryMuscles');
      if (proposal.extra_equipment.length) filled.push('extraEquipment');
      if (!form.cues.length && proposal.cues.length) filled.push('cues');
      if (!form.contraindications.length && proposal.contraindications.length) filled.push('contraindications');
      if (!form.aliases.length && proposal.aliases.length) filled.push('aliases');
      setForm((f) => ({
        ...f,
        description: f.description.trim() ? f.description : proposal.description,
        muscleGroup: proposal.muscle_group,
        secondaryMuscles: proposal.secondary_muscles,
        equipment: proposal.equipment,
        extraEquipment: proposal.extra_equipment,
        exerciseType: proposal.exercise_type,
        metric: proposal.metric,
        laterality: proposal.laterality,
        pattern: proposal.movement_pattern,
        difficulty: proposal.difficulty,
        cues: f.cues.length ? f.cues : proposal.cues,
        contraindications: f.contraindications.length ? f.contraindications : proposal.contraindications,
        aliases: f.aliases.length ? f.aliases : proposal.aliases,
      }));
      setAiFields(new Set(filled));

      // «Completar» también redacta la técnica si aún no hay
      if (form.steps.length === 0 && !form.tips.trim()) {
        setClassifyStage('technique');
        const technique = await draftTechnique(
          proposal.muscle_group,
          proposal.equipment,
          proposal.difficulty,
          true
        ).catch(() => null);
        if (technique && (technique.steps.length || technique.tips)) {
          setForm((f) => ({ ...f, steps: technique.steps, tips: technique.tips }));
          setAiFields((prev) => new Set([...prev, 'steps', 'tips']));
        }
      }
      hapticSuccess();
    } catch (e) {
      Alert.alert('No se pudo completar con IA', friendlyError(e));
    } finally {
      setClassifying(false);
      refreshQuota();
    }
  }

  /** Pasos y consejos redactados por la IA; null si no respondió (el texto genérico local no se usa aquí). */
  async function draftTechnique(
    muscle: MuscleGroup,
    equipment: string,
    difficulty: TrainingLevel,
    bundled = false
  ): Promise<{ steps: string[]; tips: string } | null> {
    const res = await generateExerciseAiDetails(form.name, muscle, equipment, difficulty, '', '', {
      instructions: true,
      tips: true,
      images: false,
      bundled,
    });
    if (res.source !== 'ai') return null;
    const steps =
      Array.isArray(res.steps) && res.steps.length > 0
        ? res.steps.map((st) => `${st.title ? `${st.title}: ` : ''}${st.description ?? ''}`.trim()).filter(Boolean)
        : parseInstructionsToSteps(res.instructions);
    return { steps, tips: res.tips };
  }

  async function runTechniqueGeneration() {
    setGeneratingTechnique(true);
    try {
      const technique = await draftTechnique(form.muscleGroup, form.equipment, form.difficulty);
      if (!technique) {
        Alert.alert('No se pudo redactar la técnica', 'La IA no respondió. Prueba de nuevo en un minuto o escríbela a mano.');
        return;
      }
      setForm((f) => ({
        ...f,
        steps: technique.steps.length ? technique.steps : f.steps,
        tips: technique.tips || f.tips,
      }));
      setAiFields((prev) => new Set([...prev, 'steps', 'tips']));
    } catch (e) {
      Alert.alert('No se pudo redactar la técnica', friendlyError(e));
    } finally {
      setGeneratingTechnique(false);
      refreshQuota();
    }
  }

  function handleGenerateTechnique() {
    if (form.name.trim().length < 3) {
      Alert.alert('Falta el nombre', 'Escribe el nombre del ejercicio para que la IA redacte la técnica.');
      return;
    }
    if (form.steps.length > 0 || form.tips.trim()) {
      Alert.alert('¿Reemplazar la técnica?', 'La IA sustituirá los pasos y consejos que ya tienes.', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Reemplazar', onPress: runTechniqueGeneration },
      ]);
      return;
    }
    runTechniqueGeneration();
  }

  async function handlePickImage(replaceIndex?: number) {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permiso requerido', 'Autoriza el acceso a tus fotos para subir una imagen del ejercicio.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.85,
      });
      if (result.canceled || !result.assets[0]?.uri) return;

      setUploadingImage(true);
      const uploadedUrl = await uploadExerciseImage(result.assets[0].uri);
      setForm((f) => {
        const images = [...f.images];
        if (replaceIndex !== undefined && replaceIndex < images.length) images[replaceIndex] = uploadedUrl;
        else images.push(uploadedUrl);
        return { ...f, images };
      });
      if (replaceIndex === undefined) setActiveImageIndex(form.images.length);
    } catch (err) {
      Alert.alert('Error al subir imagen', friendlyError(err));
    } finally {
      setUploadingImage(false);
    }
  }

  async function handlePickVideo(source: 'camera' | 'library') {
    try {
      const permission =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permiso requerido', 'Autoriza el acceso para añadir el vídeo del ejercicio.');
        return;
      }
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['videos'],
        allowsEditing: true,
        videoMaxDuration: 30,
        videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
        videoExportPreset: ImagePicker.VideoExportPreset.H264_1280x720,
      };
      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(options)
          : await ImagePicker.launchImageLibraryAsync(options);
      const asset = result.canceled ? null : result.assets[0];
      if (!asset?.uri) return;
      if (asset.duration && asset.duration > 31_000) {
        Alert.alert('Vídeo demasiado largo', 'Recórtalo a 30 segundos como máximo: basta con 2 o 3 repeticiones.');
        return;
      }

      setUploadingVideo(true);
      const path = await uploadExerciseVideo(asset.uri, asset.mimeType);
      set('videoPath', path);
    } catch (err) {
      Alert.alert('Error al subir el vídeo', friendlyError(err));
    } finally {
      setUploadingVideo(false);
    }
  }

  function handleRemoveImage(index: number) {
    setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== index) }));
    setActiveImageIndex((i) => Math.max(0, Math.min(i, form.images.length - 2)));
  }

  async function handleSave() {
    if (form.name.trim().length < 2) {
      Alert.alert('Falta el nombre', 'Escribe el nombre del ejercicio.');
      return;
    }

    const input = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      muscle_group: form.muscleGroup,
      secondary_muscles: form.secondaryMuscles.filter((m) => m !== form.muscleGroup),
      equipment: form.equipment,
      extra_equipment: form.extraEquipment.filter((e) => e !== form.equipment),
      difficulty: form.difficulty,
      exercise_type: form.exerciseType,
      metric: form.metric,
      laterality: form.laterality,
      movement_pattern: form.pattern,
      instructions: form.steps
        .filter((st) => st.trim())
        .map((st, i) => `${i + 1}. ${st.trim()}`)
        .join('\n\n'),
      tips: form.tips,
      cues: form.cues,
      contraindications: form.contraindications,
      aliases: form.aliases,
      parent_id: form.parentId,
      video_path: form.videoPath,
      images: form.images.length > 0 ? form.images : null,
      image_url: form.images[0] ?? '',
      // Un superadmin crea ejercicios oficiales; al editar se respeta el origen del ejercicio
      is_global: isSuperAdmin && (initialExercise ? !initialExercise.is_custom : true),
    };

    setSaving(true);
    try {
      const result =
        isEditing && initialExercise ? await updateExercise(initialExercise.id, input) : await createExercise(input);
      onSaved(result);
      onClose();
    } catch (err) {
      Alert.alert('No se pudo guardar', friendlyError(err));
    } finally {
      setSaving(false);
    }
  }

  // Una variante llega con el nombre vacío; «Hacer mi versión» llega con el nombre del oficial
  const title = isEditing
    ? 'Editar ejercicio'
    : template?.parent_id
      ? template.name
        ? 'Mi versión del ejercicio'
        : 'Nueva variante'
      : 'Nuevo ejercicio';

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      bare
      sheetStyle={styles.sheet}
      header={
          <View style={styles.header}>
            <View style={styles.titleWrap}>
              <View style={styles.iconWrap}>
                <Dumbbell size={s(16)} color={colors.navy} />
              </View>
              <View>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.subtitle}>
                  {isSuperAdmin ? 'Catálogo oficial CoplanFit' : 'Para tu banco de ejercicios'}
                </Text>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
              onPress={onClose}
              style={styles.closeBtn}
            >
              <X size={s(18)} color={colors.textSecondary} />
            </Pressable>
          </View>
      }
    >
          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {isSuperAdmin && (
              <View style={styles.adminBanner}>
                <Globe size={s(14)} color={colors.navy} />
                <Text style={styles.adminText}>
                  Se guardará en el catálogo oficial, visible para todos los entrenadores.
                </Text>
              </View>
            )}

            {/* Nombre + alta rápida con IA */}
            <View>
              <FieldLabel>Nombre del ejercicio *</FieldLabel>
              <TextInput
                value={form.name}
                onChangeText={(val) => set('name', val)}
                placeholder="Ej: Sentadilla goblet con kettlebell"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                returnKeyType="done"
                onSubmitEditing={() => !isEditing && handleClassify()}
              />
              {!isEditing && (
                <Pressable
                  accessibilityRole="button"
                  onPress={handleClassify}
                  disabled={form.name.trim().length < 3 || classifying}
                  style={[styles.aiBtn, (form.name.trim().length < 3 || classifying) && styles.aiBtnDisabled]}
                >
                  {classifying ? (
                    <ActivityIndicator size="small" color={colors.navy} />
                  ) : (
                    <Sparkles size={s(14)} color={colors.navy} />
                  )}
                  <Text style={styles.aiBtnText}>
                    {classifying
                      ? classifyStage === 'technique'
                        ? 'Redactando la técnica…'
                        : 'Analizando el ejercicio…'
                      : 'Completar datos con IA'}
                  </Text>
                </Pressable>
              )}
              {!isEditing && <AiQuotaHint quota={quota} style={styles.quotaHint} />}
              {aiFields.size > 0 && (
                <View style={styles.aiFilledBanner} accessibilityLiveRegion="polite">
                  <CheckCircle2 size={s(14)} color={colors.success} />
                  <Text style={styles.aiFilledText}>
                    La IA rellenó {aiFields.size} campos, marcados con «IA» y borde verde. Revísalos: al cambiar uno, la
                    marca desaparece.
                  </Text>
                </View>
              )}
              {similarExercises.length > 0 && (
                <View style={styles.duplicateBox} accessibilityLiveRegion="polite">
                  <Text style={styles.duplicateTitle}>Ya tienes ejercicios parecidos en el banco:</Text>
                  {similarExercises.map((ex) => (
                    <Text key={ex.id} style={styles.duplicateItem} numberOfLines={1}>
                      • {ex.name}
                    </Text>
                  ))}
                  <Text style={styles.duplicateHint}>
                    Si es el mismo movimiento con otro agarre, equipo o posición, guárdalo igualmente y márcalo abajo en «¿Es una variante?».
                  </Text>
                </View>
              )}
            </View>

            <View>
              <FieldLabel ai={ai('description')}>Descripción breve</FieldLabel>
              <TextInput
                value={form.description}
                onChangeText={(val) => set('description', val)}
                placeholder="Qué es y qué trabaja. Ej: Sentadilla a una pierna con el pie trasero en un banco; trabaja cuádriceps y glúteos."
                placeholderTextColor={colors.textMuted}
                multiline
                maxLength={200}
                style={[styles.input, styles.descriptionInput]}
              />
              <Text style={styles.hint}>
                Se ve en la tarjeta del ejercicio en el banco. {form.description.length}/200
              </Text>
            </View>

            <FormSection title="Clasificación" summary={classificationSummary} defaultOpen={!isEditing}>
              <SelectField
                label="Músculo principal"
                options={MUSCLE_GROUPS}
                value={form.muscleGroup}
                ai={ai('muscleGroup')}
                onChange={(m) => {
                  setForm((f) => ({
                    ...f,
                    muscleGroup: m,
                    secondaryMuscles: f.secondaryMuscles.filter((sec) => sec !== m),
                  }));
                  touch('muscleGroup');
                }}
              />
              <MultiSelectField
                label="Músculos secundarios"
                options={MUSCLE_GROUPS.filter((m) => m.id !== form.muscleGroup)}
                values={form.secondaryMuscles}
                ai={ai('secondaryMuscles')}
                onChange={(v) => set('secondaryMuscles', v)}
                sheetHint="Los que también trabajan de forma relevante. Mejor 3 como máximo."
              />
              <SelectField
                label="Equipo principal"
                options={EXERCISE_EQUIPMENT}
                value={form.equipment}
                ai={ai('equipment')}
                onChange={(v) => set('equipment', v)}
              />
              <MultiSelectField
                label="Equipo adicional"
                options={EXERCISE_EQUIPMENT.filter((e) => e.id !== form.equipment)}
                values={form.extraEquipment}
                ai={ai('extraEquipment')}
                onChange={(v) => set('extraEquipment', v)}
                sheetHint="Otro equipo imprescindible, como un banco o un cajón."
              />
              <SelectField
                label="Tipo"
                options={EXERCISE_TYPES}
                value={form.exerciseType}
                ai={ai('exerciseType')}
                onChange={(v) => set('exerciseType', v)}
              />
              <SelectField
                label="Cómo se mide"
                options={EXERCISE_METRICS}
                value={form.metric}
                ai={ai('metric')}
                onChange={(v) => set('metric', v)}
              />
              <SelectField
                label="Patrón de movimiento"
                options={MOVEMENT_PATTERNS}
                value={form.pattern}
                ai={ai('pattern')}
                onChange={(v) => set('pattern', v)}
                sheetTitle="Patrón de movimiento"
              />
              <Text style={styles.hint}>
                El tipo de movimiento (empujar, tirar, sentadilla…). Sirve para proponer alternativas equivalentes en las
                rutinas.
              </Text>
              <View>
                <FieldLabel ai={ai('laterality')}>Lateralidad</FieldLabel>
                <SingleChoice options={LATERALITIES} value={form.laterality} onChange={(v) => set('laterality', v)} />
                <Text style={styles.hint}>
                  {form.laterality === 'bilateral'
                    ? 'Bilateral: con los dos lados a la vez (press banca). Unilateral: un lado cada vez (zancada búlgara). Alternado: se alternan lados en la misma serie (curl alterno).'
                    : `En las rutinas las repeticiones se indicarán «${LATERALITIES.find((l) => l.id === form.laterality)?.suffix}».`}
                </Text>
              </View>
              <View>
                <FieldLabel ai={ai('difficulty')}>Nivel técnico</FieldLabel>
                <SingleChoice
                  options={TRAINING_LEVELS.map(({ id, label }) => ({ id, label }))}
                  value={form.difficulty}
                  onChange={(v) => set('difficulty', v)}
                />
              </View>
            </FormSection>

            <FormSection title="Técnica" summary={techniqueSummary}>
              <Pressable
                accessibilityRole="button"
                onPress={handleGenerateTechnique}
                disabled={generatingTechnique}
                style={[styles.aiBtn, generatingTechnique && styles.aiBtnDisabled]}
              >
                {generatingTechnique ? (
                  <ActivityIndicator size="small" color={colors.navy} />
                ) : (
                  <Sparkles size={s(14)} color={colors.navy} />
                )}
                <Text style={styles.aiBtnText}>
                  {generatingTechnique ? 'Redactando técnica…' : 'Redactar pasos y consejos con IA'}
                </Text>
              </Pressable>

              <View>
                <FieldLabel ai={ai('steps')}>Pasos de ejecución</FieldLabel>
                <View style={styles.stepsList}>
                  {form.steps.map((stepText, idx) => (
                    <View key={idx} style={styles.stepRow}>
                      <View style={styles.stepNum}>
                        <Text style={styles.stepNumText}>{idx + 1}</Text>
                      </View>
                      <TextInput
                        value={stepText}
                        onChangeText={(val) => set('steps', form.steps.map((st, i) => (i === idx ? val : st)))}
                        placeholder={`Paso ${idx + 1}…`}
                        placeholderTextColor={colors.textMuted}
                        multiline
                        style={styles.stepInput}
                      />
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Quitar paso ${idx + 1}`}
                        onPress={() => set('steps', form.steps.filter((_, i) => i !== idx))}
                        style={styles.iconBtn}
                      >
                        <Trash2 size={s(14)} color={colors.danger} />
                      </Pressable>
                    </View>
                  ))}
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => set('steps', [...form.steps, ''])}
                    style={styles.addRowBtn}
                  >
                    <Plus size={s(13)} color={colors.navy} />
                    <Text style={styles.addRowText}>{form.steps.length === 0 ? 'Añadir primer paso' : 'Añadir paso'}</Text>
                  </Pressable>
                </View>
              </View>

              <View>
                <FieldLabel ai={ai('tips')}>Consejos y errores a evitar</FieldLabel>
                <TextInput
                  value={form.tips}
                  onChangeText={(v) => set('tips', v)}
                  placeholder="Ej: No bloquees las rodillas al final del movimiento."
                  placeholderTextColor={colors.textMuted}
                  multiline
                  style={[styles.input, styles.textarea]}
                />
              </View>

              <View>
                <FieldLabel ai={ai('cues')}>Indicaciones de sala</FieldLabel>
                <Text style={styles.hintTop}>Frases cortas que le dices al cliente mientras lo hace.</Text>
                <TextListInput
                  values={form.cues}
                  onChange={(v) => set('cues', v)}
                  placeholder="Ej: pecho arriba"
                />
              </View>
            </FormSection>

            <FormSection title="Seguridad y búsqueda" summary={safetySummary}>
              <View>
                <FieldLabel ai={ai('contraindications')}>Evitar o adaptar si el cliente tiene</FieldLabel>
                <TextListInput
                  values={form.contraindications}
                  onChange={(v) => set('contraindications', v)}
                  placeholder="Ej: hernia discal lumbar"
                />
                <Text style={styles.hint}>
                  Al armar una rutina se avisará si coincide con las condiciones de salud del cliente.
                </Text>
              </View>
              <View>
                <FieldLabel ai={ai('aliases')}>Otros nombres (sinónimos)</FieldLabel>
                <TextListInput
                  values={form.aliases}
                  onChange={(v) => set('aliases', v)}
                  placeholder="Ej: goblet squat"
                />
              </View>
            </FormSection>

            <FormSection
              title="¿Es una variante?"
              summary={parentExercise ? `Variante de ${parentExercise.name}` : 'No es variante de otro ejercicio'}
            >
              <Text style={styles.hint}>
                Una variante es el mismo movimiento con otro agarre, equipo o posición. Ej.: «Sentadilla goblet» es
                variante de «Sentadilla». Si la enlazas, la app la sugerirá como alternativa en las rutinas.
              </Text>
              {parentExercise ? (
                <View style={styles.parentSelected}>
                  <Text style={styles.parentName} numberOfLines={1}>
                    {parentExercise.name}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Quitar ejercicio base"
                    onPress={() => set('parentId', null)}
                    style={styles.iconBtn}
                  >
                    <X size={s(14)} color={colors.textSecondary} />
                  </Pressable>
                </View>
              ) : (
                <View>
                  <TextInput
                    value={parentQuery}
                    onChangeText={setParentQuery}
                    placeholder="Busca el ejercicio base (ej: sentadilla)"
                    placeholderTextColor={colors.textMuted}
                    style={styles.input}
                  />
                  {parentResults.map((ex) => (
                    <Pressable
                      key={ex.id}
                      accessibilityRole="button"
                      onPress={() => {
                        set('parentId', ex.id);
                        setParentQuery('');
                      }}
                      style={styles.parentOption}
                    >
                      <Text style={styles.parentOptionText} numberOfLines={1}>
                        {ex.name}
                      </Text>
                      <Text style={styles.parentOptionMeta}>{muscleLabel(ex.muscle_group)}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </FormSection>

            <FormSection title="Vídeo" summary={form.videoPath ? 'Vídeo demostrativo añadido' : 'Sin vídeo'}>
              {form.videoPath ? (
                <>
                  <ExerciseVideo videoRef={form.videoPath} height={s(170)} />
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => set('videoPath', null)}
                    style={styles.removeMediaBtn}
                  >
                    <Trash2 size={s(13)} color={colors.danger} />
                    <Text style={styles.removeMediaText}>Quitar vídeo</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Text style={styles.hint}>
                    Graba 2 o 3 repeticiones (máximo 30 segundos). Se reproduce en bucle y sin sonido.
                  </Text>
                  <View style={styles.videoBtnsRow}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => handlePickVideo('camera')}
                      disabled={uploadingVideo}
                      style={styles.videoBtn}
                    >
                      {uploadingVideo ? (
                        <ActivityIndicator size="small" color={colors.navy} />
                      ) : (
                        <Video size={s(15)} color={colors.navy} />
                      )}
                      <Text style={styles.videoBtnText}>{uploadingVideo ? 'Subiendo…' : 'Grabar'}</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => handlePickVideo('library')}
                      disabled={uploadingVideo}
                      style={styles.videoBtn}
                    >
                      <Camera size={s(15)} color={colors.navy} />
                      <Text style={styles.videoBtnText}>Elegir de la galería</Text>
                    </Pressable>
                  </View>
                </>
              )}
            </FormSection>

            <FormSection title="Fotos" summary={form.images.length ? `${form.images.length} fotos` : 'Sin fotos'}>
              {form.images.length > 0 && (
                <ExerciseImageCarousel
                  images={form.images}
                  exerciseName={form.name || 'Ejercicio'}
                  muscleGroup={form.muscleGroup}
                  height={s(165)}
                  activeIndex={activeImageIndex}
                  onIndexChange={setActiveImageIndex}
                />
              )}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbsRow}>
                {form.images.map((imgUrl, idx) => (
                  <Pressable
                    key={`${idx}-${imgUrl}`}
                    accessibilityRole="button"
                    accessibilityLabel={`Ver foto ${idx + 1}`}
                    onPress={() => setActiveImageIndex(idx)}
                    style={[styles.thumbBox, idx === activeImageIndex && styles.thumbBoxActive]}
                  >
                    <Image source={{ uri: imgUrl }} style={styles.thumbImg} contentFit="cover" />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Quitar foto ${idx + 1}`}
                      onPress={() => handleRemoveImage(idx)}
                      style={styles.thumbRemoveBtn}
                      hitSlop={10}
                    >
                      <Trash2 size={s(10)} color={colors.surface} />
                    </Pressable>
                  </Pressable>
                ))}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Añadir foto"
                  onPress={() => handlePickImage()}
                  disabled={uploadingImage}
                  style={styles.addThumb}
                >
                  {uploadingImage ? (
                    <ActivityIndicator size="small" color={colors.navy} />
                  ) : (
                    <Camera size={s(16)} color={colors.navy} />
                  )}
                  <Text style={styles.addThumbText}>{uploadingImage ? 'Subiendo…' : 'Añadir foto'}</Text>
                </Pressable>
              </ScrollView>
            </FormSection>
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: insets.bottom + s(12) }]}>
            <Button
              title={saving ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Guardar ejercicio'}
              onPress={handleSave}
              loading={saving}
            />
          </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    maxHeight: '92%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: s(16),
    paddingTop: s(14),
    paddingBottom: s(10),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
  },
  titleWrap: { flexDirection: 'row', alignItems: 'center', gap: s(10) },
  iconWrap: {
    width: s(34),
    height: s(34),
    borderRadius: s(17),
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontFamily: fonts.heading, fontSize: fontSizes.base, color: colors.navy },
  subtitle: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textSecondary },
  closeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  body: { flexGrow: 0 },
  bodyContent: { padding: s(14), gap: s(10) },
  adminBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
    padding: s(10),
    borderRadius: radius.card,
    backgroundColor: colors.successBg,
  },
  adminText: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: fontSizes.xs, color: colors.navy },
  input: {
    minHeight: 44,
    paddingHorizontal: s(10),
    paddingVertical: s(8),
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    backgroundColor: colors.surface,
    fontFamily: fonts.body,
    fontSize: fontSizes.base,
    color: colors.text,
  },
  textarea: { minHeight: 72, textAlignVertical: 'top' },
  hint: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textSecondary, marginTop: s(4) },
  hintTop: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textSecondary, marginBottom: s(6) },
  aiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(8),
    minHeight: 44,
    marginTop: s(8),
    borderRadius: radius.button,
    backgroundColor: colors.lime,
  },
  aiBtnDisabled: { opacity: 0.45 },
  aiBtnText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.navy },
  descriptionInput: { minHeight: 64, textAlignVertical: 'top', paddingTop: s(10) },
  quotaHint: { marginTop: s(8) },
  aiFilledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
    marginTop: s(8),
    padding: s(10),
    borderRadius: radius.input,
    backgroundColor: colors.successBg,
  },
  aiFilledText: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: fontSizes.xs, color: colors.success },
  duplicateBox: {
    marginTop: s(8),
    padding: s(10),
    gap: s(2),
    borderRadius: radius.input,
    backgroundColor: colors.neutralChipBg,
  },
  duplicateTitle: { fontFamily: fonts.bodySemi, fontSize: fontSizes.xs, color: colors.navy },
  duplicateItem: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.text },
  duplicateHint: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textSecondary, marginTop: s(2) },
  stepsList: { gap: s(6) },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: s(6) },
  stepNum: {
    width: s(22),
    height: s(22),
    marginTop: s(9),
    borderRadius: s(11),
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.xs, color: colors.surface },
  stepInput: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: s(10),
    paddingVertical: s(8),
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    backgroundColor: colors.surface,
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.text,
  },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  addRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(6),
    minHeight: 44,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: radius.input,
  },
  addRowText: { fontFamily: fonts.bodySemi, fontSize: fontSizes.xs, color: colors.navy },
  parentSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: s(10),
    borderRadius: radius.input,
    backgroundColor: colors.successBg,
  },
  parentName: { flex: 1, fontFamily: fonts.bodySemi, fontSize: fontSizes.sm, color: colors.navy },
  parentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
    minHeight: 44,
    paddingHorizontal: s(4),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  parentOptionText: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.text },
  parentOptionMeta: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textSecondary },
  thumbsRow: { gap: s(8), paddingVertical: s(2) },
  thumbBox: {
    width: s(56),
    height: s(56),
    borderRadius: radius.input,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbBoxActive: { borderColor: colors.lime },
  thumbImg: { width: '100%', height: '100%' },
  thumbRemoveBtn: {
    position: 'absolute',
    top: s(3),
    right: s(3),
    width: s(18),
    height: s(18),
    borderRadius: s(9),
    backgroundColor: 'rgba(27, 42, 74, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addThumb: {
    width: s(56),
    height: s(56),
    borderRadius: radius.input,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(2),
  },
  addThumbText: { fontFamily: fonts.body, fontSize: fontSizes.label, color: colors.navy },
  videoBtnsRow: { flexDirection: 'row', gap: s(8) },
  videoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(6),
    minHeight: 44,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  videoBtnText: { fontFamily: fonts.bodySemi, fontSize: fontSizes.xs, color: colors.navy },
  removeMediaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(6),
    minHeight: 44,
  },
  removeMediaText: { fontFamily: fonts.bodySemi, fontSize: fontSizes.xs, color: colors.danger },
  footer: {
    padding: s(14),
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
});
