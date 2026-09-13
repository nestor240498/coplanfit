import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import {
  Camera,
  Check,
  CheckCircle2,
  Dumbbell,
  Globe,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Button } from '@/components/ui/Button';
import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';
import { generateExerciseAiDetails } from '../exerciseAiAssistant';
import {
  createExercise,
  getCurrentUserRole,
  updateExercise,
  uploadExerciseImage,
} from '../exerciseService';
import { Exercise, MUSCLE_GROUPS, MuscleGroup, TRAINING_LEVELS, TrainingLevel } from '../types';
import { ExerciseImageCarousel } from './ExerciseImageCarousel';

const EQUIPMENT_LIST = [
  { id: 'barra', label: 'Barra' },
  { id: 'mancuernas', label: 'Mancuernas' },
  { id: 'polea', label: 'Polea' },
  { id: 'maquina', label: 'Máquina' },
  { id: 'peso_corporal', label: 'Peso Corporal' },
  { id: 'bandas', label: 'Bandas' },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  onSaved: (exercise: Exercise) => void;
  initialExercise?: Exercise | null;
};

/**
 * Convierte un texto de instrucciones en un array de pasos individuales
 */
function parseInstructionsToSteps(text?: string | null): string[] {
  if (!text || !text.trim()) return [];
  // Dividir por saltos de línea O por números de pasos "1. " "2. " "3. "
  const rawParts = text
    .split(/(?:[\r\n]+|(?<=\s|^)(?=\d+[\.\)]\s))/g)
    .map((p) => p.replace(/^\d+[\.\)]\s*/, '').trim())
    .filter((p) => p.length > 0);

  return rawParts.length > 0 ? rawParts : [text.trim()];
}

export function CreateExerciseModal({ visible, onClose, onSaved, initialExercise }: Props) {
  const [name, setName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup>('pecho');
  const [equipment, setEquipment] = useState('mancuernas');
  const [difficulty, setDifficulty] = useState<TrainingLevel>('intermedio');
  const [instructionSteps, setInstructionSteps] = useState<string[]>([]);
  const [tips, setTips] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Opciones múltiples de qué diseñar con IA
  const [aiGenerateInstructions, setAiGenerateInstructions] = useState(true);
  const [aiGenerateTips, setAiGenerateTips] = useState(true);

  const [aiBannerMessage, setAiBannerMessage] = useState<string | null>(null);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isGlobal, setIsGlobal] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [saving, setSaving] = useState(false);

  const isEditing = Boolean(initialExercise);
  const isAiReady = Boolean(
    name.trim() &&
    muscleGroup &&
    equipment &&
    difficulty &&
    (aiGenerateInstructions || aiGenerateTips)
  );

  const missingAiField = !name.trim()
    ? 'Falta el nombre del ejercicio para habilitar el botón.'
    : !muscleGroup
    ? 'Falta seleccionar el grupo muscular principal.'
    : !equipment
    ? 'Falta seleccionar el equipamiento necesario.'
    : !difficulty
    ? 'Falta seleccionar el nivel de dificultad.'
    : !aiGenerateInstructions && !aiGenerateTips
    ? 'Marca al menos una casilla (Instrucciones o Consejos).'
    : null;

  useEffect(() => {
    if (visible) {
      getCurrentUserRole().then((res) => {
        setIsSuperAdmin(res.isSuperAdmin);

        if (initialExercise) {
          setName(initialExercise.name || '');
          setMuscleGroup(initialExercise.muscle_group || 'pecho');
          setEquipment(initialExercise.equipment || 'mancuernas');
          setDifficulty(initialExercise.difficulty || 'intermedio');
          setInstructionSteps(parseInstructionsToSteps(initialExercise.instructions));
          setTips(initialExercise.tips || '');
          const loadedImages = Array.isArray(initialExercise.images) && initialExercise.images.length > 0
            ? initialExercise.images
            : initialExercise.image_url
            ? [initialExercise.image_url]
            : [];
          setImages(loadedImages);
          setActiveImageIndex(0);
          setAiBannerMessage(null);
          setIsGlobal(!initialExercise.is_custom);
        } else {
          setName('');
          setMuscleGroup('pecho');
          setEquipment('mancuernas');
          setDifficulty('intermedio');
          setInstructionSteps([]);
          setTips('');
          setImages([]);
          setActiveImageIndex(0);
          setAiBannerMessage(null);
          setIsGlobal(res.isSuperAdmin);
        }
      });
    }
  }, [visible, initialExercise]);

  const [aiCounter, setAiCounter] = useState(0);

  // Funciones para manipular el repeater de pasos de instrucciones
  function handleUpdateStep(index: number, text: string) {
    setInstructionSteps((prev) => {
      const next = [...prev];
      next[index] = text;
      return next;
    });
  }

  function handleAddStep() {
    setInstructionSteps((prev) => [...prev, '']);
  }

  function handleRemoveStep(index: number) {
    setInstructionSteps((prev) => prev.filter((_, i) => i !== index));
  }

  // Diseñar con IA requiriendo todo el contexto necesario
  async function handleGenerateAi() {
    const missing: string[] = [];
    if (!name.trim()) missing.push('Nombre del ejercicio');
    if (!muscleGroup) missing.push('Grupo muscular principal');
    if (!equipment) missing.push('Equipamiento necesario');
    if (!difficulty) missing.push('Nivel de dificultad');

    if (missing.length > 0) {
      Alert.alert(
        'Contexto requerido para IA',
        `Para que IA diseñe la técnica y consejos con el contexto adecuado, por favor completa primero:\n\n• ${missing.join('\n• ')}`
      );
      return;
    }

    if (!aiGenerateInstructions && !aiGenerateTips) {
      Alert.alert(
        'Selecciona una opción',
        'Por favor marca al menos una casilla (Instrucciones o Consejos) para diseñar con IA.'
      );
      return;
    }

    setGeneratingAi(true);
    try {
      const currentFullInstructions = instructionSteps
        .map((st, i) => `${i + 1}. ${st}`)
        .join('\n\n');

      const aiData = await generateExerciseAiDetails(
        name,
        muscleGroup,
        equipment,
        difficulty,
        currentFullInstructions,
        tips,
        {
          instructions: aiGenerateInstructions,
          tips: aiGenerateTips,
          images: false,
          customSteps: instructionSteps.filter(Boolean),
        }
      );

      if (aiGenerateInstructions) {
        if (Array.isArray(aiData.steps) && aiData.steps.length > 0) {
          const formattedSteps = aiData.steps.map((st: any) => {
            const title = st.title ? `${st.title}: ` : '';
            return `${title}${st.description || ''}`.trim() || st.description || '';
          }).filter(Boolean);

          if (formattedSteps.length > 0) {
            setInstructionSteps(formattedSteps);
          } else if (aiData.instructions) {
            setInstructionSteps(parseInstructionsToSteps(aiData.instructions));
          }
        } else if (aiData.instructions) {
          setInstructionSteps(parseInstructionsToSteps(aiData.instructions));
        }
      }

      if (aiGenerateTips && aiData.tips) {
        setTips(aiData.tips);
      }

      setAiCounter((c) => c + 1);

      const generatedParts = [
        aiGenerateInstructions ? 'instrucciones' : '',
        aiGenerateTips ? 'consejos' : '',
      ].filter(Boolean).join(' y ');

      setAiBannerMessage(`¡${generatedParts.charAt(0).toUpperCase() + generatedParts.slice(1)} generados con IA para "${name.trim()}"! ✨`);
    } finally {
      setGeneratingAi(false);
    }
  }

  // Subir foto desde la galería o archivos
  async function handlePickImage(replaceIndex?: number) {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permiso requerido',
          'Necesitas autorizar el acceso a tus fotos para subir una imagen del paso.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        setUploadingImage(true);
        const uploadedUrl = await uploadExerciseImage(result.assets[0].uri);

        setImages((prev) => {
          if (typeof replaceIndex === 'number' && replaceIndex >= 0 && replaceIndex < prev.length) {
            const updated = [...prev];
            updated[replaceIndex] = uploadedUrl;
            return updated;
          }
          const next = [...prev, uploadedUrl];
          setActiveImageIndex(next.length - 1);
          return next;
        });

        setAiCounter((c) => c + 1);
      }
    } catch (err) {
      Alert.alert('Error al subir imagen', (err as Error).message);
    } finally {
      setUploadingImage(false);
    }
  }

  // Eliminar una imagen del carrusel
  function handleRemoveImage(index: number) {
    setImages((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (activeImageIndex >= next.length) {
        setActiveImageIndex(Math.max(0, next.length - 1));
      }
      return next;
    });
    setAiCounter((c) => c + 1);
  }

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Campo requerido', 'Por favor ingresa el nombre del ejercicio.');
      return;
    }

    const resolvedInstructions = instructionSteps
      .filter((st) => st.trim().length > 0)
      .map((st, i) => `${i + 1}. ${st.trim()}`)
      .join('\n\n');

    setSaving(true);
    try {
      let result: Exercise;

      if (isEditing && initialExercise) {
        result = await updateExercise(initialExercise.id, {
          name: name.trim(),
          muscle_group: muscleGroup,
          equipment,
          difficulty,
          instructions: resolvedInstructions || undefined,
          tips: tips.trim() || undefined,
          images: images.length > 0 ? images : undefined,
          image_url: images[0] || undefined,
          is_global: isSuperAdmin ? true : isGlobal,
        });

        Alert.alert('¡Ejercicio actualizado! ✅', 'Los cambios se han guardado correctamente.');
      } else {
        result = await createExercise({
          name: name.trim(),
          muscle_group: muscleGroup,
          equipment,
          difficulty,
          instructions: resolvedInstructions || undefined,
          tips: tips.trim() || undefined,
          images: images.length > 0 ? images : undefined,
          image_url: images[0] || undefined,
          is_global: isSuperAdmin ? true : isGlobal,
        });

        Alert.alert(
          '¡Ejercicio guardado! 🎉',
          isSuperAdmin || isGlobal
            ? 'Se ha añadido al catálogo oficial de CoplanFit para todos los entrenadores.'
            : 'Se ha guardado en tus ejercicios personalizados.'
        );
      }

      onSaved(result);
      onClose();
    } catch (err) {
      Alert.alert('Error al guardar', (err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleWrap}>
              <View style={styles.iconWrap}>
                <Dumbbell size={s(16)} color={colors.navy} />
              </View>
              <View>
                <Text style={styles.title}>
                  {isEditing ? 'Editar Ejercicio' : 'Crear Nuevo Ejercicio'}
                </Text>
                <Text style={styles.subtitle}>
                  {isSuperAdmin
                    ? '🌍 Catálogo Oficial CoplanFit'
                    : 'Para tu banco de entrenamiento'}
                </Text>
              </View>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={10}>
              <X size={s(18)} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
            {/* Banner de confirmación de IA */}
            {aiBannerMessage && (
              <View style={styles.aiNotificationBanner}>
                <CheckCircle2 size={s(16)} color={colors.navy} />
                <Text style={styles.aiNotificationText}>{aiBannerMessage}</Text>
              </View>
            )}

            {/* Opción Super Admin: Catálogo Oficial */}
            {isSuperAdmin && (
              <View style={styles.adminBanner}>
                <View style={styles.adminInfo}>
                  <Globe size={s(16)} color={colors.navy} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.adminTitle}>Catálogo Oficial CoplanFit</Text>
                    <Text style={styles.adminDesc}>
                      Este ejercicio se guardará directamente en el catálogo oficial y estará disponible para todos los entrenadores.
                    </Text>
                  </View>
                </View>
                <View style={styles.adminBadgeOficial}>
                  <Text style={styles.adminBadgeOficialText}>Oficial</Text>
                </View>
              </View>
            )}

            {/* Nombre */}
            <View style={styles.field}>
              <Text style={styles.label}>NOMBRE DEL EJERCICIO *</Text>
              <TextInput
                value={name}
                onChangeText={(val) => {
                  setName(val);
                  setAiBannerMessage(null);
                }}
                placeholder="Ej: Press francés en banco plano con barra Z"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
              />
            </View>

            {/* Grupo Muscular */}
            <View style={styles.field}>
              <Text style={styles.label}>GRUPO MUSCULAR PRINCIPAL *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                {MUSCLE_GROUPS.map((m) => {
                  const isActive = muscleGroup === m.id;
                  return (
                    <Pressable
                      key={m.id}
                      onPress={() => setMuscleGroup(m.id)}
                      style={[styles.chip, isActive && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                        {m.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Equipamiento */}
            <View style={styles.field}>
              <Text style={styles.label}>EQUIPAMIENTO NECESARIO *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                {EQUIPMENT_LIST.map((eq) => {
                  const isActive = equipment === eq.id;
                  return (
                    <Pressable
                      key={eq.id}
                      onPress={() => setEquipment(eq.id)}
                      style={[styles.chip, isActive && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                        {eq.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Dificultad */}
            <View style={styles.field}>
              <Text style={styles.label}>NIVEL DE DIFICULTAD</Text>
              <View style={styles.diffRow}>
                {TRAINING_LEVELS.map((lvl) => {
                  const isActive = difficulty === lvl.id;
                  return (
                    <Pressable
                      key={lvl.id}
                      onPress={() => setDifficulty(lvl.id)}
                      style={[styles.diffBtn, isActive && styles.diffBtnActive]}
                    >
                      <Text style={[styles.diffBtnText, isActive && styles.diffBtnTextActive]}>
                        {lvl.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Panel de Generación con IA y Checks Múltiples */}
            <View style={styles.aiControlCard}>
              <View style={styles.aiControlHeader}>
                <View style={styles.aiControlTitleRow}>
                  <View style={styles.aiIconBadge}>
                    <Sparkles size={s(12)} color={colors.navy} />
                  </View>
                  <Text style={styles.aiControlTitle}>ASISTENTE DE DISEÑO CON IA</Text>
                </View>
              </View>

              <Text style={styles.aiControlSubtitle}>
                Usa el nombre, grupo muscular, equipamiento y dificultad especificados arriba para que Gemini redacte la técnica y consejos con contexto biomecánico preciso.
              </Text>

              {/* Checkboxes de opciones IA */}
              <View style={styles.checksRow}>
                <Pressable
                  onPress={() => setAiGenerateInstructions((v) => !v)}
                  style={[styles.checkChip, aiGenerateInstructions && styles.checkChipActive]}
                >
                  <View style={[styles.checkboxBox, aiGenerateInstructions && styles.checkboxBoxActive]}>
                    {aiGenerateInstructions && <Check size={s(10)} color={colors.navy} strokeWidth={3} />}
                  </View>
                  <Text style={[styles.checkChipText, aiGenerateInstructions && styles.checkChipTextActive]}>
                    Instrucciones
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setAiGenerateTips((v) => !v)}
                  style={[styles.checkChip, aiGenerateTips && styles.checkChipActive]}
                >
                  <View style={[styles.checkboxBox, aiGenerateTips && styles.checkboxBoxActive]}>
                    {aiGenerateTips && <Check size={s(10)} color={colors.navy} strokeWidth={3} />}
                  </View>
                  <Text style={[styles.checkChipText, aiGenerateTips && styles.checkChipTextActive]}>
                    Consejos
                  </Text>
                </Pressable>
              </View>

              {/* Botón de Generar con IA */}
              <Pressable
                onPress={handleGenerateAi}
                disabled={!isAiReady || generatingAi}
                style={[
                  styles.aiMainActionBtn,
                  (!isAiReady || generatingAi) && styles.aiMainActionBtnDisabled,
                ]}
              >
                {generatingAi ? (
                  <>
                    <ActivityIndicator size="small" color={colors.navy} />
                    <Text style={styles.aiMainActionBtnText}>Diseñando con IA…</Text>
                  </>
                ) : (
                  <>
                    <Sparkles
                      size={s(13)}
                      color={isAiReady ? colors.navy : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.aiMainActionBtnText,
                        !isAiReady && styles.aiMainActionBtnTextDisabled,
                      ]}
                    >
                      Diseñar con IA ✨
                    </Text>
                  </>
                )}
              </Pressable>

              {/* Mensaje indicador si faltan campos para habilitar */}
              {!isAiReady && missingAiField && (
                <View style={styles.aiMissingWarningRow}>
                  <Text style={styles.aiMissingWarningText}>
                    * {missingAiField}
                  </Text>
                </View>
              )}
            </View>

            {/* Repeater de Instrucciones Paso a Paso */}
            <View style={styles.field}>
              <View style={styles.labelWithAction}>
                <Text style={styles.label}>INSTRUCCIONES DE EJECUCIÓN (PASO A PASO)</Text>
                <Text style={styles.stepsCountText}>{instructionSteps.length} Pasos</Text>
              </View>

              <View style={styles.repeaterList}>
                {instructionSteps.map((stepText, idx) => (
                  <View key={idx} style={styles.repeaterItem}>
                    <View style={styles.repeaterNumBadge}>
                      <Text style={styles.repeaterNumText}>{idx + 1}</Text>
                    </View>
                    <TextInput
                      value={stepText}
                      onChangeText={(val) => handleUpdateStep(idx, val)}
                      placeholder={`Instrucciones del paso ${idx + 1}...`}
                      placeholderTextColor={colors.textMuted}
                      multiline
                      style={styles.repeaterInput}
                    />
                    <Pressable
                      onPress={() => handleRemoveStep(idx)}
                      style={styles.repeaterDeleteBtn}
                      hitSlop={8}
                    >
                      <Trash2 size={s(13)} color={colors.danger} />
                    </Pressable>
                  </View>
                ))}

                <Pressable onPress={handleAddStep} style={styles.addStepButton}>
                  <Plus size={s(13)} color={colors.navy} />
                  <Text style={styles.addStepButtonText}>
                    {instructionSteps.length === 0
                      ? 'Añadir primer paso de ejecución'
                      : 'Añadir otro paso de ejecución'}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Tips y Errores Comunes */}
            <View style={styles.field}>
              <Text style={styles.label}>CONSEJOS Y ERRORES A EVITAR (TIPS)</Text>
              <TextInput
                value={tips}
                onChangeText={setTips}
                placeholder="Ej: Mantén los codos pegados al torso para evitar sobrecarga en los hombros."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                style={[styles.input, styles.textareaSmall]}
              />
            </View>

            {/* Carrusel y Gestión de Fotos de los Pasos */}
            <View style={styles.field}>
              <View style={styles.labelWithAction}>
                <Text style={styles.label}>FOTOS DE LOS PASOS (CARRUSEL)</Text>
                {images.length > 0 && (
                  <Text style={styles.activeStepHint}>
                    Paso {activeImageIndex + 1} de {images.length}
                  </Text>
                )}
              </View>

              {/* Vista previa del Carrusel Sincronizado */}
              <ExerciseImageCarousel
                key={`${name}-${muscleGroup}-${aiCounter}-${images.length}`}
                images={images}
                exerciseName={name || 'Ejercicio'}
                muscleGroup={muscleGroup}
                height={s(165)}
                activeIndex={activeImageIndex}
                onIndexChange={setActiveImageIndex}
              />

              {/* Fila de Miniaturas de Pasos + Botón "+" para Nuevo Paso */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.thumbsRow}
              >
                {images.map((imgUrl, idx) => {
                  const isSelected = idx === activeImageIndex;
                  return (
                    <Pressable
                      key={idx}
                      onPress={() => setActiveImageIndex(idx)}
                      style={[styles.thumbBox, isSelected && styles.thumbBoxActive]}
                    >
                      <Image source={{ uri: imgUrl }} style={styles.thumbImg} contentFit="cover" />
                      <View style={[styles.thumbBadge, isSelected && styles.thumbBadgeActive]}>
                        <Text style={[styles.thumbBadgeText, isSelected && styles.thumbBadgeTextActive]}>
                          {idx + 1}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => handleRemoveImage(idx)}
                        style={styles.thumbRemoveBtn}
                        hitSlop={6}
                      >
                        <Trash2 size={s(9)} color={colors.surface} />
                      </Pressable>
                    </Pressable>
                  );
                })}

                {/* Tarjeta con signo "+" para Añadir Nuevo Paso */}
                <Pressable
                  onPress={() => handlePickImage()}
                  disabled={uploadingImage}
                  style={styles.addStepThumbCard}
                >
                  <View style={styles.addStepIconCircle}>
                    <Plus size={s(16)} color={colors.navy} />
                  </View>
                  <Text style={styles.addStepThumbText}>Nuevo Paso</Text>
                </Pressable>
              </ScrollView>

              {/* Botón de acción para el paso activo o subir foto */}
              <View style={styles.imageActionButtons}>
                <Pressable
                  onPress={() => handlePickImage(images.length > 0 ? activeImageIndex : undefined)}
                  disabled={uploadingImage}
                  style={styles.addImageBtn}
                >
                  {uploadingImage ? (
                    <ActivityIndicator size="small" color={colors.navy} />
                  ) : (
                    <Camera size={s(13)} color={colors.navy} />
                  )}
                  <Text style={styles.addImageBtnText}>
                    {uploadingImage
                      ? 'Subiendo foto…'
                      : images.length > 0
                      ? `Cambiar foto (Paso ${activeImageIndex + 1})`
                      : 'Subir foto del paso'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>

              {/* Footer */}
              <View style={styles.footer}>
                <Button
                  title={
                    saving
                      ? 'Guardando…'
                      : isEditing
                      ? 'Guardar cambios'
                      : isGlobal
                      ? 'Guardar como ejercicio global'
                      : 'Guardar ejercicio'
                  }
                  onPress={handleSave}
                  loading={saving}
                />
              </View>
            </View>
          </View>
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
        backgroundColor: colors.surface,
        borderTopLeftRadius: radius.card,
        borderTopRightRadius: radius.card,
        maxHeight: '82%',
        display: 'flex',
      },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: s(20),
    paddingTop: s(18),
    paddingBottom: s(12),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
  },
  iconWrap: {
    width: s(36),
    height: s(36),
    borderRadius: s(18),
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.base,
    color: colors.navy,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    color: colors.textSecondary,
  },
  closeBtn: {
    padding: s(4),
  },
  body: {
    flexGrow: 0,
  },
  bodyContent: {
    padding: s(20),
    gap: s(14),
  },
  aiNotificationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
    backgroundColor: 'rgba(139, 197, 63, 0.2)',
    borderWidth: 1,
    borderColor: colors.lime,
    borderRadius: radius.card,
    padding: s(10),
  },
  aiNotificationText: {
    flex: 1,
    fontFamily: fonts.bodyBold,
    fontSize: s(8.5),
    color: colors.navy,
  },
  adminBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(139, 197, 63, 0.15)',
    borderWidth: 1,
    borderColor: colors.lime,
    borderRadius: radius.card,
    padding: s(12),
    gap: s(10),
  },
  adminInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
    flex: 1,
  },
  adminTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.xs,
    color: colors.navy,
  },
  adminDesc: {
    fontFamily: fonts.body,
    fontSize: s(8.5),
    color: colors.textSecondary,
  },
  adminBadgeOficial: {
    backgroundColor: colors.lime,
    paddingHorizontal: s(8),
    paddingVertical: s(4),
    borderRadius: radius.pill,
  },
  adminBadgeOficialText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.label,
    color: colors.navy,
  },
  aiControlCard: {
    backgroundColor: 'rgba(139, 197, 63, 0.12)',
    borderWidth: 1,
    borderColor: colors.lime,
    borderRadius: radius.card,
    padding: s(12),
    gap: s(10),
  },
  aiControlHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiControlTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
  },
  aiIconBadge: {
    width: s(22),
    height: s(22),
    borderRadius: s(11),
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiControlTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: s(8.5),
    color: colors.navy,
    letterSpacing: 0.5,
  },
  aiControlSubtitle: {
    fontFamily: fonts.body,
    fontSize: s(8),
    color: colors.textSecondary,
    lineHeight: s(12),
  },
  checksRow: {
    flexDirection: 'row',
    gap: s(6),
    flexWrap: 'wrap',
  },
  checkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: s(10),
    paddingVertical: s(6),
    borderRadius: radius.chip,
  },
  checkChipActive: {
    borderColor: colors.lime,
    backgroundColor: 'rgba(139, 197, 63, 0.22)',
  },
  checkboxBox: {
    width: s(14),
    height: s(14),
    borderRadius: s(3),
    borderWidth: 1,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  checkboxBoxActive: {
    backgroundColor: colors.lime,
    borderColor: colors.lime,
  },
  checkChipText: {
    fontFamily: fonts.body,
    fontSize: s(8),
    color: colors.textSecondary,
  },
  checkChipTextActive: {
    fontFamily: fonts.bodyBold,
    color: colors.navy,
  },
  aiMainActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(6),
    backgroundColor: colors.lime,
    paddingVertical: s(9),
    borderRadius: radius.input,
    shadowColor: colors.lime,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
    marginTop: s(2),
  },
  aiMainActionBtnDisabled: {
    backgroundColor: 'rgba(27, 42, 74, 0.08)',
    shadowOpacity: 0,
    elevation: 0,
  },
  aiMainActionBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.xs,
    color: colors.navy,
  },
  aiMainActionBtnTextDisabled: {
    color: colors.textMuted,
    fontFamily: fonts.bodyBold,
  },
  aiMissingWarningRow: {
    paddingHorizontal: s(2),
    marginTop: s(1),
  },
  aiMissingWarningText: {
    fontFamily: fonts.body,
    fontSize: s(7.8),
    color: '#DC2626',
    lineHeight: s(11),
  },
  field: {
    gap: s(4),
  },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: s(8.5),
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  labelWithAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepsCountText: {
    fontFamily: fonts.bodyBold,
    fontSize: s(8),
    color: colors.navy,
  },
  activeStepHint: {
    fontFamily: fonts.bodyBold,
    fontSize: s(8),
    color: colors.navy,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    paddingHorizontal: s(12),
    height: s(40),
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.text,
  },
  textareaSmall: {
    minHeight: s(72),
    paddingTop: s(10),
    paddingHorizontal: s(12),
    textAlignVertical: 'top',
    fontSize: fontSizes.xs,
    lineHeight: s(14),
  },
  chipsRow: {
    gap: s(6),
    paddingVertical: s(2),
  },
  chip: {
    paddingHorizontal: s(10),
    paddingVertical: s(6),
    borderRadius: radius.chip,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  chipText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    color: colors.textSecondary,
  },
  chipTextActive: {
    fontFamily: fonts.bodyBold,
    color: colors.surface,
  },
  diffRow: {
    flexDirection: 'row',
    gap: s(8),
  },
  diffBtn: {
    flex: 1,
    paddingVertical: s(8),
    borderRadius: radius.input,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  diffBtnActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  diffBtnText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    color: colors.textSecondary,
  },
  diffBtnTextActive: {
    fontFamily: fonts.bodyBold,
    color: colors.surface,
  },
  repeaterList: {
    gap: s(8),
  },
  repeaterItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: s(10),
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: s(10),
  },
  repeaterNumBadge: {
    width: s(22),
    height: s(22),
    borderRadius: s(11),
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: s(2),
  },
  repeaterNumText: {
    fontFamily: fonts.bodyBold,
    fontSize: s(8.5),
    color: colors.surface,
  },
  repeaterInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.text,
    minHeight: s(52),
    textAlignVertical: 'top',
    paddingTop: s(2),
    paddingBottom: s(2),
    lineHeight: s(14),
  },
  repeaterDeleteBtn: {
    padding: s(4),
    marginTop: s(2),
  },
  addStepButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(6),
    paddingVertical: s(8),
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.navy,
    borderRadius: radius.card,
    backgroundColor: 'rgba(27, 42, 74, 0.03)',
  },
  addStepButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.label,
    color: colors.navy,
  },
  thumbsRow: {
    gap: s(8),
    paddingVertical: s(4),
    alignItems: 'center',
  },
  thumbBox: {
    width: s(54),
    height: s(54),
    borderRadius: radius.card,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  thumbBoxActive: {
    borderColor: colors.lime,
    borderWidth: 2.5,
    shadowColor: colors.lime,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 3,
  },
  thumbImg: {
    width: '100%',
    height: '100%',
  },
  thumbBadge: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: s(15),
    height: s(15),
    borderRadius: s(7.5),
    backgroundColor: 'rgba(27, 42, 74, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbBadgeActive: {
    backgroundColor: colors.lime,
  },
  thumbBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: s(7.5),
    color: colors.surface,
  },
  thumbBadgeTextActive: {
    color: colors.navy,
  },
  thumbRemoveBtn: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: s(16),
    height: s(16),
    borderRadius: s(8),
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addStepThumbCard: {
    width: s(54),
    height: s(54),
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.navy,
    backgroundColor: 'rgba(27, 42, 74, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  addStepIconCircle: {
    width: s(22),
    height: s(22),
    borderRadius: s(11),
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addStepThumbText: {
    fontFamily: fonts.bodyBold,
    fontSize: s(6.5),
    color: colors.navy,
    textAlign: 'center',
  },
  imageActionButtons: {
    flexDirection: 'row',
    gap: s(8),
    marginTop: s(4),
  },
  addImageBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(6),
    paddingVertical: s(8),
    borderRadius: radius.input,
    backgroundColor: 'rgba(139, 197, 63, 0.15)',
    borderWidth: 1,
    borderColor: colors.lime,
  },
  addImageBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.label,
    color: colors.navy,
  },
  footer: {
    paddingHorizontal: s(20),
    paddingTop: s(10),
    paddingBottom: s(24),
  },
});
