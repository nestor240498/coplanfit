import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { HeartPulse, Pencil, Scale, User, Users, UtensilsCrossed } from 'lucide-react-native';
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

import { Button } from '@/components/ui/Button';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { TabBar, TabItem } from '@/components/ui/TabBar';
import { AntropometriaTab, MeasurementFormState } from '@/features/clients/components/AntropometriaTab';
import { DatosTab } from '@/features/clients/components/DatosTab';
import { EditNameSheet } from '@/features/clients/components/EditNameSheet';
import { PlanesTab } from '@/features/clients/components/PlanesTab';
import { SaludTab } from '@/features/clients/components/SaludTab';
import { createMeasurement, getLatestMeasurement } from '@/features/clients/measurementsRepository';
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
import { formatDateShort, formatMonthYear } from '@/lib/format';
import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

const TABS: TabItem<'datos' | 'salud' | 'antropometria' | 'planes'>[] = [
  { key: 'datos', label: 'Datos', icon: User },
  { key: 'salud', label: 'Salud', icon: HeartPulse },
  { key: 'antropometria', label: 'Antropometría', icon: Scale },
  { key: 'planes', label: 'Planes', icon: UtensilsCrossed },
];

const EMPTY_MEASUREMENT_FORM: MeasurementFormState = {
  weight: '',
  height: '',
  bodyFat: '',
  muscleMass: '',
  waterPct: '',
  boneMass: '',
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
  midaxillary: '',
};

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [tab, setTab] = useState<'datos' | 'salud' | 'antropometria' | 'planes'>('datos');
  const [client, setClient] = useState<Client | null>(null);
  const [tags, setTags] = useState<ClientTag[]>([]);
  const [measurement, setMeasurement] = useState<Measurement | null>(null);
  const [planVersions, setPlanVersions] = useState<PlanVersion[]>([]);
  const [planDraft, setPlanDraft] = useState<PlanVersionWithData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editNameOpen, setEditNameOpen] = useState(false);

  // Estado de edición in-situ de mediciones
  const [isEditingMeasurements, setIsEditingMeasurements] = useState(false);
  const [savingMeasurement, setSavingMeasurement] = useState(false);
  const [measurementForm, setMeasurementForm] = useState<MeasurementFormState>(EMPTY_MEASUREMENT_FORM);

  const loadDraftToStore = usePlanBuilderStore((s) => s.loadDraft);

  const load = useCallback(() => {
    if (!id) return;
    let cancelled = false;
    setError(null);
    Promise.all([
      getClient(id),
      listTags(id),
      getLatestMeasurement(id),
      listPlanVersions(id),
      getPlanDraft(id),
    ])
      .then(([c, t, m, pv, draft]) => {
        if (cancelled) return;
        setClient(c);
        setTags(t);
        setMeasurement(m);
        setPlanVersions(pv);
        setPlanDraft(draft);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useFocusEffect(load);

  function reloadTags() {
    if (id) listTags(id).then(setTags);
  }

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

  async function handleDeleteDraft() {
    if (!id) return;
    try {
      await deletePlanDraft(id);
      setPlanDraft(null);
    } catch (e) {
      Alert.alert('Error al descartar', (e as Error).message);
    }
  }

  function handleTabChange(nextTab: 'datos' | 'salud' | 'antropometria' | 'planes') {
    if (tab === 'antropometria' && isEditingMeasurements) {
      setIsEditingMeasurements(false);
    }
    setTab(nextTab);
  }

  function handleStartEditingMeasurements() {
    setMeasurementForm({
      weight: measurement?.weight_kg != null ? String(measurement.weight_kg) : '',
      height: measurement?.height_cm != null ? String(measurement.height_cm) : '',
      bodyFat: measurement?.body_fat_pct != null ? String(measurement.body_fat_pct) : '',
      muscleMass: measurement?.muscle_mass_pct != null ? String(measurement.muscle_mass_pct) : '',
      waterPct: measurement?.water_pct != null ? String(measurement.water_pct) : '',
      boneMass: measurement?.bone_mass_kg != null ? String(measurement.bone_mass_kg) : '',
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
      midaxillary: measurement?.midaxillary_mm != null ? String(measurement.midaxillary_mm) : '',
    });
    setIsEditingMeasurements(true);
  }

  function handleChangeMeasurementForm(key: keyof MeasurementFormState, value: string) {
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

      const rawH = num(measurementForm.height);
      const heightCm = rawH != null ? (rawH > 3 ? rawH : rawH * 100) : null;

      const created = await createMeasurement(id, {
        weight_kg: num(measurementForm.weight),
        height_cm: heightCm,
        body_fat_pct: num(measurementForm.bodyFat),
        muscle_mass_pct: num(measurementForm.muscleMass),
        water_pct: num(measurementForm.waterPct),
        bone_mass_kg: num(measurementForm.boneMass),
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
        midaxillary_mm: num(measurementForm.midaxillary),
      });

      setMeasurement(created);
      setIsEditingMeasurements(false);
      Alert.alert('Medición guardada', 'La nueva medición ha sido registrada exitosamente.');
    } catch (e) {
      Alert.alert('Error al guardar medición', (e as Error).message);
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

  const subtitle = [
    client.age != null ? `${client.age} años` : null,
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
      <ScreenHeader
        title={client.full_name}
        subtitle={subtitle}
        showBack
        breadcrumbs={[
          { label: 'Clientes', href: '/', icon: Users },
          { label: client.full_name },
        ]}
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Editar foto y nombre"
            onPress={() => setEditNameOpen(true)}
            style={styles.avatarButton}
          >
            <View style={styles.headerAvatar}>
              {client.avatar_url ? (
                <Image source={{ uri: client.avatar_url }} style={styles.headerAvatarImg} contentFit="cover" />
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

      <ScrollView
        style={styles.tabContentScroll}
        contentContainerStyle={styles.tabContentScrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {tab === 'datos' && (
          <DatosTab
            client={client}
            tags={tags}
            latestMeasurementLabel={measurement != null ? formatDateShort(measurement.measured_at) : null}
            onReloadTags={reloadTags}
            onUpdateClient={handleUpdateClient}
            onViewAnthropometry={() => setTab('antropometria')}
          />
        )}
        {tab === 'salud' && <SaludTab client={client} onUpdateClient={handleUpdateClient} />}
        {tab === 'antropometria' && (
          <AntropometriaTab
            measurement={measurement}
            isEditing={isEditingMeasurements}
            formState={measurementForm}
            onChangeFormState={handleChangeMeasurementForm}
            onViewHistory={() => router.push(`/client/${id}/measurements/history`)}
          />
        )}
        {tab === 'planes' && (
          <PlanesTab
            clientId={client.id}
            clientName={client.full_name}
            clientGoal={client.goal}
            versions={planVersions}
            draft={planDraft}
            onNewVersion={() => router.push(`/client/${id}/plans/new`)}
            onResumeDraft={handleResumeDraft}
            onDeleteDraft={handleDeleteDraft}
            onCompare={([a, b]) => router.push(`/client/${id}/plans/compare?a=${a}&b=${b}`)}
            onViewVersion={(versionId) => router.push(`/client/${id}/plans/preview?versionId=${versionId}`)}
          />
        )}
      </ScrollView>

      {tab === 'antropometria' && (
        <View style={styles.fixedTabFooter}>
          {isEditingMeasurements ? (
            <View style={styles.editButtonsRow}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setIsEditingMeasurements(false)}
                disabled={savingMeasurement}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </Pressable>
              <Button
                title={savingMeasurement ? 'Guardando…' : 'Guardar medición'}
                onPress={handleSaveMeasurements}
                loading={savingMeasurement}
                style={{ flex: 1 }}
              />
            </View>
          ) : (
            <Button
              title="Actualizar medición"
              onPress={handleStartEditingMeasurements}
            />
          )}
        </View>
      )}

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
    height: s(40),
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
    fontSize: s(10),
    color: colors.textSecondary,
  },
  errorText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.danger,
    textAlign: 'center',
  },
  editBtn: {
    padding: s(4),
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: s(11),
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
});

