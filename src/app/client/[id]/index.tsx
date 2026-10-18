import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { FadeInLeft, FadeInRight, useReducedMotion } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { Dumbbell, HeartPulse, Pencil, Scale, User, UtensilsCrossed } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { StorageImage } from '@/components/ui/StorageImage';
import { AppBackground } from '@/components/ui/AppBackground';
import { PressableScale } from '@/components/ui/PressableScale';
import { toast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { TabBar, TabItem } from '@/components/ui/TabBar';
import { AntropometriaTab, MeasurementFormState } from '@/features/clients/components/AntropometriaTab';
import { DatosTab } from '@/features/clients/components/DatosTab';
import { EditNameSheet } from '@/features/clients/components/EditNameSheet';
import { PlanesTab } from '@/features/clients/components/PlanesTab';
import { SaludTab } from '@/features/clients/components/SaludTab';
import {
  createMeasurement,
  listMeasurements,
  uploadMeasurementPhotos,
} from '@/features/clients/measurementsRepository';
import { usePlanBuilderStore } from '@/features/clients/planBuilderStore';
import {
  deletePlanDraft,
  getPlanDraft,
  listPlanVersions,
  PlanVersionWithData,
} from '@/features/clients/plansRepository';
import {
  getClient,
  updateClient,
} from '@/features/clients/repository';
import { listTags } from '@/features/clients/tagsRepository';
import {
  Client,
  ClientTag,
  Measurement,
  PlanVersion,
} from '@/features/clients/types';
import { EntrenamientoTab } from '@/features/workouts/components/EntrenamientoTab';
import { WorkoutPlanVersion } from '@/features/workouts/types';
import { useWorkoutBuilderStore } from '@/features/workouts/workoutBuilderStore';
import { deleteWorkoutDraft, listWorkoutPlanVersions } from '@/features/workouts/workoutsRepository';
import { importPdfAsDraft } from '@/features/anthropometry/pdfImport';
import { AiProgressModal } from '@/components/ui/AiProgressModal';
import { RegisterMeasurementsSheet, type RegisterChoice } from '@/features/anthropometry/components/RegisterMeasurementsSheet';
import { type DraftSummary, deleteDraft, loadDraftSummary } from '@/features/anthropometry/draftStorage';
import { friendlyError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { describeMeasurementChange } from '@/lib/measurementTrends';
import { DURATION, EASE_OUT, hapticSelection, hapticSuccess } from '@/lib/motion';
import { calculateAge, formatDateShort, formatMonthYear, localDateIso } from '@/lib/format';
import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

const TABS: TabItem<'datos' | 'salud' | 'antropometria' | 'planes' | 'entrenamiento'>[] = [
  { key: 'datos', label: 'Datos', icon: User },
  { key: 'salud', label: 'Salud', icon: HeartPulse },
  { key: 'antropometria', label: 'Antropometría', icon: Scale },
  { key: 'planes', label: 'Nutrición', icon: UtensilsCrossed },
  { key: 'entrenamiento', label: 'Entrenamiento', icon: Dumbbell },
];

const EMPTY_MEASUREMENT_FORM: MeasurementFormState = {
  photos: [],
  weight: '',
  height: '',
  bodyFat: '',
  muscleMass: '',
  visceralFat: '',
  bmrKcal: '',
  neck: '',
  shoulders: '',
  chest: '',
  waist: '',
  abdomen: '',
  hip: '',
  armRight: '',
  armLeft: '',
  armFlexedRight: '',
  armFlexedLeft: '',
  forearmRight: '',
  forearmLeft: '',
  thighRight: '',
  thighLeft: '',
  calfRight: '',
  calfLeft: '',
  triceps: '',
  biceps: '',
  subscapular: '',
  supraspinal: '',
  suprailiac: '',
  abdominal: '',
  thighSkin: '',
  calfSkin: '',
  chestSkin: '',
};

export default function ClientDetailScreen() {
  const { id, tab: tabParam } = useLocalSearchParams<{ id: string; tab?: string }>();
  const router = useRouter();

  const [tab, setTab] = useState<'datos' | 'salud' | 'antropometria' | 'planes' | 'entrenamiento'>(
    tabParam === 'antropometria' || tabParam === 'salud' || tabParam === 'planes' || tabParam === 'entrenamiento' ? tabParam : 'datos'
  );
  const [client, setClient] = useState<Client | null>(null);
  const [tags, setTags] = useState<ClientTag[]>([]);
  const [allMeasurements, setAllMeasurements] = useState<Measurement[]>([]);
  const [measurement, setMeasurement] = useState<Measurement | null>(null);
  const [planVersions, setPlanVersions] = useState<PlanVersion[]>([]);
  const [planDraft, setPlanDraft] = useState<PlanVersionWithData | null>(null);
  const [workoutVersions, setWorkoutVersions] = useState<WorkoutPlanVersion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editNameOpen, setEditNameOpen] = useState(false);

  // Estado de edición in-situ de mediciones
  const [isEditingMeasurements, setIsEditingMeasurements] = useState(false);
  const [savingMeasurement, setSavingMeasurement] = useState(false);
  const [measurementForm, setMeasurementForm] = useState<MeasurementFormState>(EMPTY_MEASUREMENT_FORM);
  // Copia del formulario al empezar a editar: permite saber si hay cambios sin guardar
  const [measurementFormInitial, setMeasurementFormInitial] = useState<MeasurementFormState>(EMPTY_MEASUREMENT_FORM);

  const loadDraftToStore = usePlanBuilderStore((s) => s.loadDraft);
  // Evaluación ISAK a medias guardada en el dispositivo
  const [isakDraft, setIsakDraft] = useState<DraftSummary | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [readingPdf, setReadingPdf] = useState<{ name: string; sizeKb: number } | null>(null);

  const load = useCallback(() => {
    if (!id) return;
    let cancelled = false;
    setError(null);
    Promise.all([
      getClient(id),
      listTags(id),
      listMeasurements(id),
      listPlanVersions(id),
      getPlanDraft(id),
      listWorkoutPlanVersions(id).catch(() => []),
    ])
      .then(([c, t, m, pv, draft, wv]) => {
        if (cancelled) return;
        setClient(c);
        setTags(t);
        setAllMeasurements(m);
        setMeasurement(m[0] ?? null);
        setPlanVersions(pv);
        setPlanDraft(draft);
        setWorkoutVersions(wv);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(friendlyError(e));
      });
    supabase.auth
      .getSession()
      .then(({ data }) => (data.session ? loadDraftSummary(data.session.user.id, id, Date.now()) : null))
      .then((summary) => {
        if (!cancelled) setIsakDraft(summary);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [id]);

  useFocusEffect(load);

  function reloadTags() {
    if (id) listTags(id).then(setTags);
  }

  // Se incrementa al enviar un documento para recargar el historial de envíos de la pestaña Datos
  const [sentRefreshKey, setSentRefreshKey] = useState(0);
  const bumpSent = () => setSentRefreshKey((k) => k + 1);

  async function handleUpdateClient(patch: Parameters<typeof updateClient>[1]) {
    if (!id) return;
    await updateClient(id, patch);
    setClient((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  async function handleSaveClientProfile(data: { full_name: string; avatar_url?: string | null }) {
    await handleUpdateClient(data);
  }

  function handleResumeDraft() {
    if (!id || !planDraft) return;
    loadDraftToStore(id, planDraft.data);
    const step = planDraft.data.savedStep ?? 1;
    if (step === 2) {
      router.push(`/client/${id}/plans/assistant`);
    } else if (step === 3) {
      router.push(`/client/${id}/plans/assign`);
    } else {
      router.push(`/client/${id}/plans/new`);
    }
  }

  /** Descartar un borrador lo borra de la base de datos: se pide confirmación. */
  function confirmDiscardDraft(kind: 'plan' | 'rutina', onConfirm: () => void) {
    Alert.alert(
      kind === 'plan' ? '¿Descartar el borrador del plan?' : '¿Descartar el borrador de la rutina?',
      'Se perderá todo lo que llevas hecho en él. Las versiones ya publicadas no se tocan.',
      [
        { text: 'Seguir editando', style: 'cancel' },
        { text: 'Descartar', style: 'destructive', onPress: onConfirm },
      ]
    );
  }

  async function handleDeleteDraft() {
    if (!id) return;
    try {
      const draftIdToDelete = planDraft?.id;
      setPlanDraft(null);
      usePlanBuilderStore.getState().reset();
      if (draftIdToDelete) {
        setPlanVersions((prev) => prev.filter((v) => v.id !== draftIdToDelete));
      }
      await deletePlanDraft(id, draftIdToDelete);
      const updatedVersions = await listPlanVersions(id);
      setPlanVersions(updatedVersions);
    } catch (e) {
      toast({ message: `No se pudo descartar el borrador: ${friendlyError(e)}`, tone: 'danger' });
    }
  }

  function handleResumeWorkoutDraft(draft: WorkoutPlanVersion) {
    if (!id) return;
    useWorkoutBuilderStore.getState().initBuilder(
      id,
      draft.name.replace(' (Borrador)', ''),
      draft.data?.weekly_schedule || []
    );
    if (draft.data?.notes) {
      useWorkoutBuilderStore.getState().setNotes(draft.data.notes);
    }
    router.push(`/client/${id}/workouts/assistant`);
  }

  async function handleDeleteWorkoutDraft(draftId: string) {
    if (!id) return;
    try {
      setWorkoutVersions((prev) => prev.filter((v) => v.id !== draftId));
      await deleteWorkoutDraft(draftId);
      const updated = await listWorkoutPlanVersions(id);
      setWorkoutVersions(updated);
    } catch (e) {
      toast({ message: `No se pudo descartar el borrador: ${friendlyError(e)}`, tone: 'danger' });
    }
  }

  /** Salir de la edición de medidas: si hay cambios sin guardar, se confirma antes de perderlos. */
  function leaveMeasurementEditing(onLeave: () => void) {
    const dirty = JSON.stringify(measurementForm) !== JSON.stringify(measurementFormInitial);
    if (!dirty) {
      setIsEditingMeasurements(false);
      onLeave();
      return;
    }
    Alert.alert('¿Descartar los cambios?', 'La medición que estás editando no se ha guardado.', [
      { text: 'Seguir editando', style: 'cancel' },
      {
        text: 'Descartar',
        style: 'destructive',
        onPress: () => {
          setIsEditingMeasurements(false);
          onLeave();
        },
      },
    ]);
  }

  // Deslizar el contenido cambia de pestaña. Solo con movimiento claramente horizontal, para no
  // interferir con el scroll vertical; desactivado mientras se edita una medición.
  const [tabDirection, setTabDirection] = useState<1 | -1>(1);
  const reduceMotion = useReducedMotion();
  const tabEntering = reduceMotion
    ? undefined
    : (tabDirection === 1 ? FadeInRight : FadeInLeft).duration(DURATION.state).easing(EASE_OUT);

  function goToAdjacentTab(step: 1 | -1) {
    const index = TABS.findIndex((t) => t.key === tab);
    const next = TABS[index + step];
    if (!next) return;
    hapticSelection();
    handleTabChange(next.key);
  }

  const swipeTabs = Gesture.Pan()
    .enabled(!isEditingMeasurements)
    .activeOffsetX([-30, 30])
    .failOffsetY([-12, 12])
    .onEnd((e) => {
      if (e.translationX < -60 || e.velocityX < -700) scheduleOnRN(goToAdjacentTab, 1);
      else if (e.translationX > 60 || e.velocityX > 700) scheduleOnRN(goToAdjacentTab, -1);
    });

  function handleTabChange(nextTab: 'datos' | 'salud' | 'antropometria' | 'planes' | 'entrenamiento') {
    const from = TABS.findIndex((t) => t.key === tab);
    const to = TABS.findIndex((t) => t.key === nextTab);
    setTabDirection(to >= from ? 1 : -1);
    if (tab === 'antropometria' && isEditingMeasurements) {
      leaveMeasurementEditing(() => setTab(nextTab));
      return;
    }
    setTab(nextTab);
  }

  async function handleImportPdf() {
    if (!client) return;
    try {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user.id;
      if (!uid) throw new Error('Sesión expirada. Vuelve a iniciar sesión.');
      if (isakDraft) {
        const replace = await new Promise<boolean>((resolve) =>
          Alert.alert('Tienes una medición a medias', 'Si importas el informe, la anterior se descarta. No se puede deshacer.', [
            { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Descartar e importar', style: 'destructive', onPress: () => resolve(true) },
          ])
        );
        if (!replace) return;
      }
      if (await importPdfAsDraft(client, uid, setReadingPdf)) {
        hapticSuccess();
        setIsakDraft(await loadDraftSummary(uid, client.id, Date.now()));
        toast({ message: 'Informe leído. Revisa las medidas antes de guardar.', tone: 'success' });
        router.push(`/client/${id}/measurements/session` as never);
      }
    } catch (e) {
      Alert.alert('No se pudo leer el informe', friendlyError(e));
    } finally {
      setReadingPdf(null);
    }
  }

  function handleDiscardIsakDraft() {
    Alert.alert('¿Descartar la medición?', 'Se borrarán las lecturas anotadas. No se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Descartar',
        style: 'destructive',
        onPress: async () => {
          const { data } = await supabase.auth.getSession();
          if (data.session) await deleteDraft(data.session.user.id, id).catch(() => {});
          setIsakDraft(null);
        },
      },
    ]);
  }

  function handleRegisterChoice(choice: RegisterChoice) {
    setRegisterOpen(false);
    const base = `/client/${id}/measurements/session`;
    if (choice === 'basic') {
      handleStartEditingMeasurements();
      return;
    }
    if (choice === 'import_pdf') {
      // Espera a que la hoja termine de cerrarse: iOS no presenta el selector de archivos encima
      setTimeout(handleImportPdf, 400);
      return;
    }
    const target = `${base}?profile=${choice}`;
    if (!isakDraft) {
      router.push(target as never);
      return;
    }
    // Empezar otra medición descartaría la que está a medias
    Alert.alert('Tienes una medición a medias', 'Si empiezas otra, la anterior se descarta. No se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Descartar y empezar',
        style: 'destructive',
        onPress: async () => {
          const { data } = await supabase.auth.getSession();
          if (data.session) await deleteDraft(data.session.user.id, id).catch(() => {});
          setIsakDraft(null);
          router.push(target as never);
        },
      },
    ]);
  }

  function handleStartEditingMeasurements() {
    // Tras una evaluación ISAK solo se copian peso y talla: los pliegues y porcentajes calculados
    // aparecerían como «medidos hoy» en el registro rápido
    if (measurement?.protocol === 'isak_restricted' || measurement?.protocol === 'skinfolds') {
      const initial: MeasurementFormState = {
        ...EMPTY_MEASUREMENT_FORM,
        weight: measurement.weight_kg != null ? String(measurement.weight_kg) : '',
        height: measurement.height_cm != null ? String(measurement.height_cm) : '',
      };
      setMeasurementForm(initial);
      setMeasurementFormInitial(initial);
      setIsEditingMeasurements(true);
      return;
    }
    const initialForm: MeasurementFormState = {
      photos: measurement?.photos ? [...measurement.photos] : [],
      weight: measurement?.weight_kg != null ? String(measurement.weight_kg) : '',
      height: measurement?.height_cm != null ? String(measurement.height_cm) : '',
      bodyFat: measurement?.body_fat_pct != null ? String(measurement.body_fat_pct) : '',
      muscleMass: measurement?.muscle_mass_pct != null ? String(measurement.muscle_mass_pct) : '',
      visceralFat: measurement?.visceral_fat != null ? String(measurement.visceral_fat) : '',
      bmrKcal: measurement?.bmr_kcal != null ? String(measurement.bmr_kcal) : '',
      neck: measurement?.neck_cm != null ? String(measurement.neck_cm) : '',
      shoulders: measurement?.shoulders_cm != null ? String(measurement.shoulders_cm) : '',
      chest: measurement?.chest_cm != null ? String(measurement.chest_cm) : '',
      waist: measurement?.waist_cm != null ? String(measurement.waist_cm) : '',
      abdomen: measurement?.abdomen_cm != null ? String(measurement.abdomen_cm) : '',
      hip: measurement?.hip_cm != null ? String(measurement.hip_cm) : '',
      armRight:
        measurement?.arm_right_cm != null
          ? String(measurement.arm_right_cm)
          : measurement?.arm_cm != null
          ? String(measurement.arm_cm)
          : '',
      armLeft: measurement?.arm_left_cm != null ? String(measurement.arm_left_cm) : '',
      armFlexedRight: measurement?.arm_flexed_right_cm != null ? String(measurement.arm_flexed_right_cm) : '',
      armFlexedLeft: measurement?.arm_flexed_left_cm != null ? String(measurement.arm_flexed_left_cm) : '',
      forearmRight: measurement?.forearm_right_cm != null ? String(measurement.forearm_right_cm) : '',
      forearmLeft: measurement?.forearm_left_cm != null ? String(measurement.forearm_left_cm) : '',
      thighRight: measurement?.thigh_right_cm != null ? String(measurement.thigh_right_cm) : '',
      thighLeft: measurement?.thigh_left_cm != null ? String(measurement.thigh_left_cm) : '',
      calfRight: measurement?.calf_right_cm != null ? String(measurement.calf_right_cm) : '',
      calfLeft: measurement?.calf_left_cm != null ? String(measurement.calf_left_cm) : '',
      triceps: measurement?.triceps_mm != null ? String(measurement.triceps_mm) : '',
      biceps: measurement?.biceps_mm != null ? String(measurement.biceps_mm) : '',
      subscapular: measurement?.subscapular_mm != null ? String(measurement.subscapular_mm) : '',
      supraspinal: measurement?.supraspinal_mm != null ? String(measurement.supraspinal_mm) : '',
      suprailiac: measurement?.suprailiac_mm != null ? String(measurement.suprailiac_mm) : '',
      abdominal: measurement?.abdominal_mm != null ? String(measurement.abdominal_mm) : '',
      thighSkin: measurement?.thigh_mm != null ? String(measurement.thigh_mm) : '',
      calfSkin: measurement?.calf_mm != null ? String(measurement.calf_mm) : '',
      chestSkin: measurement?.chest_mm != null ? String(measurement.chest_mm) : '',
    };
    setMeasurementForm(initialForm);
    setMeasurementFormInitial(initialForm);
    setIsEditingMeasurements(true);
  }

  function handleChangeMeasurementForm(key: keyof MeasurementFormState, value: any) {
    setMeasurementForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSaveMeasurements() {
    if (!id) return;
    setSavingMeasurement(true);
    try {
      function num(v: string): number | null {
        const parsed = Number(v.replace(',', '.'));
        return v.trim() === '' || Number.isNaN(parsed) ? null : parsed;
      }

      const uploadedUrls = await uploadMeasurementPhotos(id, measurementForm.photos || []);

      const rawH = num(measurementForm.height);
      const heightCm = rawH != null ? (rawH > 3 ? rawH : rawH * 100) : null;

      const created = await createMeasurement(id, {
        measured_at: localDateIso(),
        photos: uploadedUrls.length > 0 ? uploadedUrls : undefined,
        weight_kg: num(measurementForm.weight),
        height_cm: heightCm,
        body_fat_pct: num(measurementForm.bodyFat),
        muscle_mass_pct: num(measurementForm.muscleMass),
        visceral_fat: num(measurementForm.visceralFat),
        bmr_kcal: num(measurementForm.bmrKcal),
        neck_cm: num(measurementForm.neck),
        shoulders_cm: num(measurementForm.shoulders),
        chest_cm: num(measurementForm.chest),
        waist_cm: num(measurementForm.waist),
        abdomen_cm: num(measurementForm.abdomen),
        hip_cm: num(measurementForm.hip),
        arm_cm: num(measurementForm.armRight) ?? num(measurementForm.armLeft),
        arm_right_cm: num(measurementForm.armRight),
        arm_left_cm: num(measurementForm.armLeft),
        arm_flexed_right_cm: num(measurementForm.armFlexedRight),
        arm_flexed_left_cm: num(measurementForm.armFlexedLeft),
        forearm_right_cm: num(measurementForm.forearmRight),
        forearm_left_cm: num(measurementForm.forearmLeft),
        thigh_right_cm: num(measurementForm.thighRight),
        thigh_left_cm: num(measurementForm.thighLeft),
        calf_right_cm: num(measurementForm.calfRight),
        calf_left_cm: num(measurementForm.calfLeft),
        triceps_mm: num(measurementForm.triceps),
        biceps_mm: num(measurementForm.biceps),
        subscapular_mm: num(measurementForm.subscapular),
        supraspinal_mm: num(measurementForm.supraspinal),
        suprailiac_mm: num(measurementForm.suprailiac),
        abdominal_mm: num(measurementForm.abdominal),
        thigh_mm: num(measurementForm.thighSkin),
        calf_mm: num(measurementForm.calfSkin),
        chest_mm: num(measurementForm.chestSkin),
      });

      const change = describeMeasurementChange(measurement, created, client?.goal ?? null);
      setMeasurement(created);
      setAllMeasurements((prev) => [created, ...prev]);
      setIsEditingMeasurements(false);
      hapticSuccess();
      toast({ message: change.message, tone: 'success', duration: 5000 });
    } catch (e) {
      toast({ message: `No se pudo guardar la medición: ${friendlyError(e)}`, tone: 'danger' });
    } finally {
      setSavingMeasurement(false);
    }
  }

  if (error != null) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Cliente" showBack />
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>No se pudo cargar el cliente: {error}</Text>
        </View>
      </View>
    );
  }

  if (client == null) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Cliente" showBack />
        <ActivityIndicator style={styles.centerBox} color={colors.navy} />
      </View>
    );
  }

  const clientAge = calculateAge(client.birth_date) ?? client.age;
  const subtitle = [
    clientAge != null ? `${clientAge} años` : null,
    `Cliente desde ${formatMonthYear(client.created_at)}`,
  ]
    .filter(Boolean)
    .join(' · ');
  const initials = client.full_name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');

  return (
    <View style={styles.screen}>
      <AppBackground />
      <ScreenHeader
        title={client.full_name}
        subtitle={subtitle}
        showBack
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Editar foto y nombre"
            onPress={() => setEditNameOpen(true)}
            style={styles.avatarButton}
          >
            <View style={styles.headerAvatar}>
              {client.avatar_url ? (
                <StorageImage mediaRef={client.avatar_url} style={styles.headerAvatarImg} contentFit="cover" />
              ) : (
                <Text style={styles.headerAvatarInitials}>{initials || 'C'}</Text>
              )}
            </View>
            <View style={styles.avatarBadge}>
              <Pencil size={s(9)} color={colors.surface} strokeWidth={2.5} />
            </View>
          </Pressable>
        }
      />

      <TabBar items={TABS} active={tab} onChange={handleTabChange} />

      <GestureDetector gesture={swipeTabs}>
      <ScrollView
        style={styles.tabContentScroll}
        contentContainerStyle={styles.tabContentScrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View key={tab} entering={tabEntering}>
        {tab === 'datos' && (
          <DatosTab
            client={client}
            latestMeasurementLabel={measurement != null ? formatDateShort(measurement.measured_at) : null}
            onUpdateClient={handleUpdateClient}
            onViewAnthropometry={() => setTab('antropometria')}
            latestHasPhotos={(measurement?.photos?.length ?? 0) > 0}
            sentRefreshKey={sentRefreshKey}
            onSent={bumpSent}
          />
        )}
        {tab === 'salud' && (
          <SaludTab
            client={client}
            tags={tags}
            onReloadTags={reloadTags}
            onUpdateClient={handleUpdateClient}
          />
        )}
        {tab === 'antropometria' && (
          <AntropometriaTab
            client={client}
            measurement={measurement}
            isEditing={isEditingMeasurements}
            formState={measurementForm}
            onChangeFormState={handleChangeMeasurementForm}
            measurements={allMeasurements}
            draft={isakDraft}
            onResumeDraft={() => router.push(`/client/${id}/measurements/session` as never)}
            onDiscardDraft={handleDiscardIsakDraft}
            onViewHistory={() => router.push(`/client/${id}/measurements/history`)}
            onOpenAnalysis={(measurementId) =>
              router.push({ pathname: '/client/[id]/measurements/[measurementId]', params: { id, measurementId } })
            }
            onSent={bumpSent}
          />
        )}
        {tab === 'planes' && (
          <PlanesTab
            clientId={client.id}
            clientName={client.full_name}
            clientGoal={client.goal}
            clientPhone={client.phone}
            onSent={bumpSent}
            tags={tags}
            onReloadTags={reloadTags}
            onUpdateClient={handleUpdateClient}
            versions={planVersions}
            draft={planDraft}
            onNewVersion={() => router.push(`/client/${id}/plans/new`)}
            onResumeDraft={handleResumeDraft}
            onDeleteDraft={() => confirmDiscardDraft('plan', handleDeleteDraft)}
            onCompare={([a, b]) => router.push(`/client/${id}/plans/compare?a=${a}&b=${b}`)}
            onViewVersion={(versionId) => router.push(`/client/${id}/plans/preview?versionId=${versionId}`)}
          />
        )}
        {tab === 'entrenamiento' && (
          <EntrenamientoTab
            client={client}
            tags={tags}
            versions={workoutVersions}
            onUpdateClient={handleUpdateClient}
            onNewWorkoutPlan={() => router.push(`/client/${id}/workouts/new`)}
            onViewWorkoutPlan={(versionId) => router.push(`/client/${id}/workouts/preview?versionId=${versionId}`)}
            onResumeDraft={handleResumeWorkoutDraft}
            onDeleteDraft={(draftId: string) => confirmDiscardDraft('rutina', () => handleDeleteWorkoutDraft(draftId))}
          />
        )}
        </Animated.View>
      </ScrollView>
      </GestureDetector>

      {tab === 'antropometria' && (
        <View style={styles.fixedTabFooter}>
          {isEditingMeasurements ? (
            <View style={styles.editButtonsRow}>
              <PressableScale
                accessibilityRole="button"
                onPress={() => leaveMeasurementEditing(() => {})}
                disabled={savingMeasurement}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </PressableScale>
              <Button
                title={savingMeasurement ? 'Guardando…' : 'Guardar medición'}
                onPress={handleSaveMeasurements}
                loading={savingMeasurement}
                style={{ flex: 1 }}
              />
            </View>
          ) : (
            <Button title="+ Registrar medidas" onPress={() => setRegisterOpen(true)} />
          )}
        </View>
      )}

      <RegisterMeasurementsSheet
        visible={registerOpen}
        onClose={() => setRegisterOpen(false)}
        onChoose={handleRegisterChoice}
      />

      <AiProgressModal
        visible={readingPdf != null}
        title="Leyendo el informe"
        clientName={client.full_name}
        inputs={[
          readingPdf ? `Archivo: ${readingPdf.name} (${readingPdf.sizeKb} KB)` : 'Informe PDF',
          'Se buscan las 21 medidas del perfil ISAK y los resultados del informe',
        ]}
        slowHint="Si la IA no responde, podrás volver a intentarlo o anotar las medidas a mano."
      />

      <EditNameSheet
        key={`${client.id}-${client.full_name}-${client.avatar_url ?? ''}`}
        visible={editNameOpen}
        clientId={client.id}
        initialName={client.full_name}
        initialAvatarUrl={client.avatar_url}
        onClose={() => setEditNameOpen(false)}
        onSave={handleSaveClientProfile}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  tabContentScroll: { flex: 1 },
  tabContentScrollContent: { flexGrow: 1},
  fixedTabFooter: {
    padding: s(16),
    paddingBottom: s(20),
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  editButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
  },
  cancelBtn: {
    minHeight: 48,
    paddingHorizontal: s(16),
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  cancelBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  errorText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.danger,
    textAlign: 'center',
  },
  editBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    padding: s(4),
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
  },
  avatarButton: {
    position: 'relative',
  },
  headerAvatar: {
    width: s(36),
    height: s(36),
    borderRadius: s(18),
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1.5,
    borderColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  headerAvatarImg: {
    width: '100%',
    height: '100%',
  },
  headerAvatarInitials: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.sm,
    color: colors.surface,
  },
  avatarBadge: {
    position: 'absolute',
    right: -s(2),
    bottom: -s(2),
    width: s(16),
    height: s(16),
    borderRadius: s(8),
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: s(20),
    marginTop: s(20),
  },
});

