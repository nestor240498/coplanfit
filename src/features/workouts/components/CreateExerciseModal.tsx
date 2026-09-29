import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Camera, CheckCircle2, Dumbbell, Globe, Plus, Sparkles, Trash2, Video, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Button } from '@/components/ui/Button';
import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';
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
import { FieldLabel, FormSection, MultiChoice, SingleChoice, TextListInput } from './ExerciseFormControls';

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
  const [classifying, setClassifying] = useState(false);
  const [aiFilled, setAiFilled] = useState(false);
  const [generatingTechnique, setGeneratingTechnique] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [parentQuery, setParentQuery] = useState('');
  const [saving, setSaving] = useState(false);

  const isEditing = Boolean(initialExercise);
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

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
      setAiFilled(false);
      setActiveImageIndex(0);
      setParentQuery('');
    }
  }

  useEffect(() => {
    if (visible) getCurrentUserRole().then((res) => setIsSuperAdmin(res.isSuperAdmin));
  }, [visible]);

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
    form.steps.length + form.cues.length > 0
      ? `${form.steps.length} pasos · ${form.cues.length} indicaciones`
      : 'Sin técnica todavía';
  const safetySummary =
    [
      form.contraindications.length ? `${form.contraindications.length} contraindicaciones` : '',
      form.aliases.length ? `${form.aliases.length} sinónimos` : '',
    ]
      .filter(Boolean)
      .join(' · ') || 'Opcional';

  async function handleClassify() {
    if (form.name.trim().length < 3) return;
    setClassifying(true);
    try {
      const ai = await classifyExercise(form.name);
      setForm((f) => ({
        ...f,
        muscleGroup: ai.muscle_group,
        secondaryMuscles: ai.secondary_muscles,
        equipment: ai.equipment,
        extraEquipment: ai.extra_equipment,
        exerciseType: ai.exercise_type,
        metric: ai.metric,
        laterality: ai.laterality,
        pattern: ai.movement_pattern,
        difficulty: ai.difficulty,
        // Lo que el entrenador ya escribió no se pisa
        cues: f.cues.length ? f.cues : ai.cues,
        contraindications: f.contraindications.length ? f.contraindications : ai.contraindications,
        aliases: f.aliases.length ? f.aliases : ai.aliases,
      }));
      setAiFilled(true);
    } catch (e) {
      Alert.alert('No se pudo completar con IA', (e as Error).message);
    } finally {
      setClassifying(false);
    }
  }

  async function runTechniqueGeneration() {
    setGeneratingTechnique(true);
    try {
      const ai = await generateExerciseAiDetails(
        form.name,
        form.muscleGroup,
        form.equipment,
        form.difficulty,
        '',
        '',
        { instructions: true, tips: true, images: false }
      );
      const steps =
        Array.isArray(ai.steps) && ai.steps.length > 0
          ? ai.steps.map((st) => `${st.title ? `${st.title}: ` : ''}${st.description ?? ''}`.trim()).filter(Boolean)
          : parseInstructionsToSteps(ai.instructions);
      setForm((f) => ({ ...f, steps: steps.length ? steps : f.steps, tips: ai.tips || f.tips }));
    } catch (e) {
      Alert.alert('No se pudo redactar la técnica', (e as Error).message);
    } finally {
      setGeneratingTechnique(false);
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
      Alert.alert('Error al subir imagen', (err as Error).message);
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
      Alert.alert('Error al subir el vídeo', (err as Error).message);
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
      Alert.alert('No se pudo guardar', (err as Error).message);
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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
        <View style={styles.sheet}>
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
                    {classifying ? 'Analizando el ejercicio…' : 'Completar datos con IA'}
                  </Text>
                </Pressable>
              )}
              {aiFilled && (
                <View style={styles.aiFilledBanner} accessibilityLiveRegion="polite">
                  <CheckCircle2 size={s(14)} color={colors.success} />
                  <Text style={styles.aiFilledText}>
                    La IA propuso la clasificación, las indicaciones y los sinónimos. Revísalos antes de guardar.
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

            <FormSection title="Clasificación" summary={classificationSummary} defaultOpen={!isEditing}>
              <View>
                <FieldLabel>Músculo principal</FieldLabel>
                <SingleChoice
                  options={MUSCLE_GROUPS}
                  value={form.muscleGroup}
                  onChange={(m) =>
                    setForm((f) => ({
                      ...f,
                      muscleGroup: m,
                      secondaryMuscles: f.secondaryMuscles.filter((sec) => sec !== m),
                    }))
                  }
                />
              </View>
              <View>
                <FieldLabel>Músculos secundarios</FieldLabel>
                <MultiChoice
                  options={MUSCLE_GROUPS.filter((m) => m.id !== form.muscleGroup)}
                  values={form.secondaryMuscles}
                  onChange={(v) => set('secondaryMuscles', v)}
                />
              </View>
              <View>
                <FieldLabel>Equipo principal</FieldLabel>
                <SingleChoice options={EXERCISE_EQUIPMENT} value={form.equipment} onChange={(v) => set('equipment', v)} />
              </View>
              <View>
                <FieldLabel>Equipo adicional</FieldLabel>
                <MultiChoice
                  options={EXERCISE_EQUIPMENT.filter((e) => e.id !== form.equipment)}
                  values={form.extraEquipment}
                  onChange={(v) => set('extraEquipment', v)}
                />
              </View>
              <View>
                <FieldLabel>Tipo</FieldLabel>
                <SingleChoice options={EXERCISE_TYPES} value={form.exerciseType} onChange={(v) => set('exerciseType', v)} />
              </View>
              <View>
                <FieldLabel>Cómo se mide</FieldLabel>
                <SingleChoice options={EXERCISE_METRICS} value={form.metric} onChange={(v) => set('metric', v)} />
                <Text style={styles.hint}>
                  Ejemplo: {EXERCISE_METRICS.find((m) => m.id === form.metric)?.hint}
                </Text>
              </View>
              <View>
                <FieldLabel>Lateralidad</FieldLabel>
                <SingleChoice options={LATERALITIES} value={form.laterality} onChange={(v) => set('laterality', v)} />
                <Text style={styles.hint}>
                  {form.laterality === 'bilateral'
                    ? 'Bilateral: con los dos lados a la vez (press banca). Unilateral: un lado cada vez (zancada búlgara). Alternado: se alternan lados en la misma serie (curl alterno).'
                    : `En las rutinas las repeticiones se indicarán «${LATERALITIES.find((l) => l.id === form.laterality)?.suffix}».`}
                </Text>
              </View>
              <View>
                <FieldLabel>Patrón de movimiento</FieldLabel>
                <SingleChoice options={MOVEMENT_PATTERNS} value={form.pattern} onChange={(v) => set('pattern', v)} />
                <Text style={styles.hint}>
                  El tipo de movimiento (empujar, tirar, sentadilla…). Sirve para proponer alternativas equivalentes
                  en las rutinas.
                </Text>
              </View>
              <View>
                <FieldLabel>Nivel técnico</FieldLabel>
                <SingleChoice options={TRAINING_LEVELS} value={form.difficulty} onChange={(v) => set('difficulty', v)} />
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
                <FieldLabel>Pasos de ejecución</FieldLabel>
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
                <FieldLabel>Consejos y errores a evitar</FieldLabel>
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
                <FieldLabel>Indicaciones de sala</FieldLabel>
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
                <FieldLabel>Evitar o adaptar si el cliente tiene</FieldLabel>
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
                <FieldLabel>Otros nombres (sinónimos)</FieldLabel>
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

          <View style={styles.footer}>
            <Button
              title={saving ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Guardar ejercicio'}
              onPress={handleSave}
              loading={saving}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
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
    paddingBottom: s(24),
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
});
