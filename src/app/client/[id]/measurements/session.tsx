import { useKeepAwake } from 'expo-keep-awake';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Users } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, StyleSheet, Text, View } from 'react-native';

import { AiProgressModal } from '@/components/ui/AiProgressModal';
import { AppBackground } from '@/components/ui/AppBackground';
import { Button } from '@/components/ui/Button';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { toast } from '@/components/ui/Toast';
import { MeasureStep, type PairFeedback } from '@/features/anthropometry/components/MeasureStep';
import { SessionToolbar } from '@/features/anthropometry/components/SessionToolbar';
import { SessionOverviewSheet } from '@/features/anthropometry/components/SessionOverviewSheet';
import { type SetupResult, SessionSetup } from '@/features/anthropometry/components/SessionSetup';
import { SessionReview } from '@/features/anthropometry/components/SessionReview';
import { deleteDraft, loadDraft, saveDraft } from '@/features/anthropometry/draftStorage';
import {
  createSession,
  currentReadingNumber,
  currentSite,
  type IsakSession,
  measuredCount,
  needsThird,
  relativeDiffPct,
  type SessionActionInput,
  type SessionProfile,
  sessionReducer,
  SITE_BY_ID,
  type SiteId,
  type SiteValues,
  sitesNeedingThird,
  unresolvedSites,
} from '@/features/anthropometry/engine';
import { sessionToMeasurementInput, siteValuesFromMeasurement } from '@/features/anthropometry/fromMeasurement';
import { pickAndExtractIsakPdf } from '@/features/anthropometry/pdfImport';
import { announceSite, speak, stopSpeaking } from '@/features/anthropometry/voice';
import { createMeasurement, listMeasurements, uploadMeasurementPhotos } from '@/features/clients/measurementsRepository';
import { getClient, updateClient } from '@/features/clients/repository';
import type { Client, Measurement, Sex } from '@/features/clients/types';
import { friendlyError } from '@/lib/errors';
import { useRetained } from '@/lib/useRetained';
import { ageAt } from '@/lib/format';
import { describeMeasurementChange } from '@/lib/measurementTrends';
import { hapticSelection, hapticSuccess, hapticWarning } from '@/lib/motion';
import { supabase } from '@/lib/supabase';
import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes, lineHeights } from '@/theme/typography';

/** Último valor medido de cada punto en evaluaciones anteriores («Última vez: 11,0 mm»). */
function previousValues(history: Measurement[]): SiteValues {
  const values: SiteValues = {};
  for (const m of history) {
    const sites = siteValuesFromMeasurement(m);
    for (const [id, value] of Object.entries(sites) as [SiteId, number | null][]) {
      if (values[id] == null && value != null) values[id] = value;
    }
  }
  return values;
}

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Evaluación ISAK guiada: configuración → toma por rondas (o seguidas) → revisión → guardar.
 * El progreso se guarda como borrador en el dispositivo: se puede pausar y retomar.
 */
export default function IsakSessionScreen() {
  const { id, profile: profileParam } = useLocalSearchParams<{ id: string; profile?: string }>();
  const router = useRouter();
  useKeepAwake('isak-session', { suppressDeactivateWarnings: true });

  const [client, setClient] = useState<Client | null>(null);
  const [trainerId, setTrainerId] = useState<string | null>(null);
  const [history, setHistory] = useState<Measurement[]>([]);
  const [session, setSession] = useState<IsakSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<PairFeedback | null>(null);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingStatus, setSavingStatus] = useState<string | null>(null);
  // Archivo que se está leyendo con IA: mientras tanto una ventana bloquea toda la pantalla
  const [readingPdf, setReadingPdf] = useState<{ name: string; sizeKb: number } | null>(null);
  const shownReadingPdf = useRetained(readingPdf);
  // Texto que la voz dice antes del siguiente punto («Diferencia alta…», «Segunda ronda»)
  const voicePrefix = useRef<string | null>(null);
  const latestSession = useRef<IsakSession | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const uid = data.session?.user.id;
        if (!uid) throw new Error('Sesión expirada. Vuelve a iniciar sesión.');
        const [c, measurements, draft] = await Promise.all([
          getClient(id),
          listMeasurements(id),
          loadDraft(uid, id, Date.now()).catch(() => null),
        ]);
        if (cancelled) return;
        setTrainerId(uid);
        setClient(c);
        setHistory(measurements);
        setSession(draft);
      } catch (e) {
        if (!cancelled) setLoadError(friendlyError(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      stopSpeaking();
    };
  }, [id]);

  // Borrador: se guarda poco después de cada cambio y al pasar la app a segundo plano
  useEffect(() => {
    latestSession.current = session;
    if (!session) return;
    const timer = setTimeout(() => saveDraft(session).catch(() => {}), 400);
    return () => clearTimeout(timer);
  }, [session]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' && latestSession.current) saveDraft(latestSession.current).catch(() => {});
    });
    return () => sub.remove();
  }, []);

  // Voz: anuncia cada punto nuevo (con el aviso pendiente delante, si lo hay)
  const site = session ? currentSite(session) : null;
  const readingNumber = session ? currentReadingNumber(session) : 0;
  const voiceOn = session?.voice ?? false;
  useEffect(() => {
    if (!voiceOn || !site) return;
    const prefix = voicePrefix.current;
    voicePrefix.current = null;
    const ordinal = ['', 'Primera', 'Segunda', 'Tercera'][readingNumber] ?? '';
    if (prefix) speak(`${prefix} ${SITE_BY_ID[site].short}. ${ordinal} medida.`);
    else announceSite(SITE_BY_ID[site].short, readingNumber);
  }, [site, readingNumber, voiceOn]);

  function dispatch(action: SessionActionInput) {
    const now = Date.now();
    setSession((prev) => (prev ? sessionReducer(prev, { ...action, now } as Parameters<typeof sessionReducer>[1]) : prev));
  }

  async function handleUpdateClient(patch: { sex?: Sex; birth_date?: string | null; age?: number | null }) {
    if (!client) return;
    try {
      await updateClient(client.id, patch);
      setClient({ ...client, ...patch });
    } catch (e) {
      Alert.alert('No se pudo guardar', friendlyError(e));
    }
  }

  function handleStart(setup: SetupResult) {
    if (!trainerId || !client) return;
    hapticSelection();
    setSession(
      createSession(
        {
          id: makeId(),
          clientId: client.id,
          trainerId,
          measuredOn: setup.measuredOn,
          mode: setup.mode,
          order: setup.order,
          profile: setup.profile,
          sites: setup.sites,
          fatEquation: setup.fatEquation,
          voice: setup.mode === 'guided' && setup.voice,
        },
        Date.now()
      )
    );
  }

  async function handleImportPdf() {
    if (!trainerId || !client) return;
    try {
      const extracted = await pickAndExtractIsakPdf(client.id, setReadingPdf);
      if (!extracted) return;
      hapticSuccess();
      setSession(
        createSession(
          {
            id: makeId(),
            clientId: client.id,
            trainerId,
            measuredOn: extracted.measuredOn,
            mode: 'transcribe',
            order: 'rounds',
            sites: extracted.sites,
            fatEquation: null,
            source: 'isakmetry_pdf',
            reported: extracted.reported,
            initialReadings: extracted.readings,
          },
          Date.now()
        )
      );
      toast({ message: `Leí ${extracted.sites.length} medidas del informe. Revísalas antes de guardar.`, tone: 'success' });
    } catch (e) {
      Alert.alert('No se pudo leer el informe', friendlyError(e));
    } finally {
      setReadingPdf(null);
    }
  }

  function handleRecord(value: number) {
    if (!session) return;
    const current = currentSite(session);
    if (!current) return;
    const prev = session.readings[current] ?? [];
    if (prev.length === 1 && session.mode === 'guided') {
      const ok = !needsThird(current, prev[0], value);
      setFeedback({ siteId: current, diffPct: relativeDiffPct(prev[0], value), ok });
      if (ok) hapticSuccess();
      else {
        hapticWarning();
        if (session.order === 'rounds') voicePrefix.current = 'Diferencia alta, se repetirá al final.';
      }
    } else {
      setFeedback(null);
    }
    dispatch({ type: 'record', value });
  }

  function handleStartPass() {
    if (!session) return;
    const next = session.pass === 1 && session.sites.some((sid) => (session.readings[sid]?.length ?? 0) === 1) ? 2 : 3;
    if (session.voice) voicePrefix.current = next === 2 ? 'Segunda ronda.' : 'Terceras medidas.';
    setFeedback(null);
    dispatch({ type: 'startPass' });
  }

  function handlePause() {
    stopSpeaking();
    if (session) {
      saveDraft(session).catch(() => {});
      toast('Evaluación en pausa: la retomas desde Antropometría.');
    }
    router.back();
  }

  async function handleAddPhoto(source: 'camera' | 'library') {
    try {
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permiso requerido', 'Se requiere acceso a la cámara para tomar fotos de progreso.');
          return;
        }
        const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.85 });
        if (!result.canceled && result.assets[0]?.uri) setPhotos((p) => [...p, result.assets[0].uri]);
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
        if (!result.canceled) setPhotos((p) => [...p, ...result.assets.map((a) => a.uri).filter(Boolean)]);
      }
    } catch (e) {
      Alert.alert('Error al seleccionar imagen', friendlyError(e));
    }
  }

  function handleSave() {
    if (!session) return;
    const pending = unresolvedSites(session).filter((sid) => (session.readings[sid]?.length ?? 0) > 0);
    if (pending.length) {
      Alert.alert(
        'Hay puntos sin terminar',
        `${pending.map((sid) => SITE_BY_ID[sid].short).join(', ')} no tienen todas sus lecturas. ¿Guardar con lo que hay?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Guardar igualmente', onPress: doSave },
        ]
      );
      return;
    }
    doSave();
  }

  async function doSave() {
    if (!session || !client || !trainerId) return;
    setSaving(true);
    try {
      setSavingStatus('Guardando…');
      const uploaded = await uploadMeasurementPhotos(client.id, photos, (current, total) =>
        setSavingStatus(`Subiendo foto ${current} de ${total}…`)
      );
      setSavingStatus('Guardando…');
      const created = await createMeasurement(client.id, {
        ...sessionToMeasurementInput(session, client),
        photos: uploaded.length > 0 ? uploaded : undefined,
      });
      await deleteDraft(trainerId, client.id).catch(() => {});
      hapticSuccess();
      const change = describeMeasurementChange(history[0] ?? null, created, client.goal);
      toast({ message: change.message, tone: 'success', duration: 5000 });
      router.dismissTo(`/client/${client.id}`);
      router.push({ pathname: '/client/[id]/measurements/[measurementId]', params: { id: client.id, measurementId: created.id, saved: '1' } });
    } catch (e) {
      Alert.alert('No se pudo guardar', friendlyError(e));
      setSaving(false);
      setSavingStatus(null);
    }
  }

  function handleDiscard() {
    Alert.alert('¿Descartar la evaluación?', 'Se borrarán todas las lecturas anotadas. No se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Descartar',
        style: 'destructive',
        onPress: async () => {
          if (trainerId) await deleteDraft(trainerId, id).catch(() => {});
          stopSpeaking();
          router.back();
        },
      },
    ]);
  }

  const profile: SessionProfile = session?.profile ?? (profileParam === 'skinfolds' ? 'skinfolds' : 'isak');
  // Midiendo, la cabecera se reduce al título para dejar sitio al teclado
  const measuring = session?.phase === 'measure';
  const profileTitle = profile === 'skinfolds' ? 'Pliegues Jackson-Pollock' : 'Evaluación ISAK';
  const previous = previousValues(history);
  const ageYears = client ? (ageAt(client.birth_date, session?.measuredOn) ?? client.age) : null;
  const total = session?.queue.length ?? 0;
  const passLabel = session
    ? session.mode === 'transcribe'
      ? 'Copiando'
      : session.pass === 3
        ? 'Terceras'
        : session.order === 'consecutive'
          ? 'Seguidas'
          : `Ronda ${session.pass}`
    : '';

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ gestureEnabled: !session }} />
      <AppBackground />
      <ScreenHeader
        title={profileTitle}
        backHref={`/client/${id}?tab=antropometria`}
        subtitle={measuring ? undefined : client?.full_name}
        showBack
        breadcrumbs={measuring ? undefined : [
          { label: 'Clientes', href: '/', icon: Users },
          { label: client?.full_name || 'Cliente', href: `/client/${id}?tab=antropometria` },
          { label: profile === 'skinfolds' ? 'Pliegues' : 'ISAK' },
        ]}
      />

      {loading ? (
        <ActivityIndicator style={styles.spinner} color={colors.navy} />
      ) : loadError || !client ? (
        <View style={styles.center}>
          <Text style={styles.error}>{loadError ?? 'No se encontró el cliente.'}</Text>
          <Button title="Volver" onPress={() => router.back()} />
        </View>
      ) : !session ? (
        <SessionSetup
          profile={profile}
          client={client}
          onUpdateClient={handleUpdateClient}
          onStart={handleStart}
          onImportPdf={handleImportPdf}
          importingPdf={readingPdf != null}
        />
      ) : session.phase === 'measure' && site ? (
        <MeasureStep
          siteId={site}
          readingNumber={readingNumber}
          readings={session.readings[site] ?? []}
          passLabel={passLabel}
          step={Math.min(session.index + 1, total)}
          stepTotal={total}
          previous={previous[site] ?? null}
          ageYears={ageYears}
          feedback={feedback}
          voice={session.voice}
          canGoBack={session.history.length > 0}
          onRecord={handleRecord}
          onSkip={() => {
            setFeedback(null);
            dispatch({ type: 'skip' });
          }}
          onBack={() => {
            setFeedback(null);
            dispatch({ type: 'back' });
          }}
          onToggleVoice={() => {
            if (session.voice) stopSpeaking();
            dispatch({ type: 'setVoice', voice: !session.voice });
          }}
          onOpenOverview={() => setOverviewOpen(true)}
          onDiscard={handleDiscard}
          onPause={handlePause}
        />
      ) : session.phase === 'break' ? (
        <>
        <SessionToolbar onDiscard={handleDiscard} onPause={handlePause} />
        <PassBreak session={session} onContinue={handleStartPass} onReview={() => dispatch({ type: 'finishEarly' })} />
        </>
      ) : (
        <>
        <SessionToolbar onDiscard={handleDiscard} onPause={handlePause} />
        <SessionReview
          session={session}
          client={client}
          photos={photos}
          saving={saving}
          savingStatus={savingStatus}
          onEditReadings={(siteId, readings) => dispatch({ type: 'editReadings', siteId, readings })}
          onRequestThird={(siteIds) => {
            if (session.voice) voicePrefix.current = 'Terceras medidas.';
            dispatch({ type: 'requestThird', siteIds });
          }}
          onRetake={(siteIds) => dispatch({ type: 'retake', siteIds })}
          onSetMeasuredOn={(measuredOn) => dispatch({ type: 'setMeasuredOn', measuredOn })}
          onSetFatEquation={(fatEquation) => dispatch({ type: 'setFatEquation', fatEquation })}
          onAddPhoto={handleAddPhoto}
          onRemovePhoto={(index) => setPhotos((p) => p.filter((_, i) => i !== index))}
          onSave={handleSave}
          onDiscard={handleDiscard}
        />
        </>
      )}

      <AiProgressModal
        visible={readingPdf != null}
        title="Leyendo el informe"
        clientName={client?.full_name}
        inputs={[
          shownReadingPdf ? `Archivo: ${shownReadingPdf.name} (${shownReadingPdf.sizeKb} KB)` : 'Informe PDF',
          'Se buscan las 21 medidas del perfil ISAK y los resultados del informe',
        ]}
        slowHint="Si la IA no responde, podrás volver a intentarlo o anotar las medidas a mano."
      />

      {session && (
        <SessionOverviewSheet
          visible={overviewOpen}
          session={session}
          onClose={() => setOverviewOpen(false)}
          onFinishEarly={() => {
            setOverviewOpen(false);
            dispatch({ type: 'finishEarly' });
          }}
        />
      )}
    </View>
  );
}

/** Pausa entre rondas: cuántos puntos van y qué toca ahora. */
function PassBreak({ session, onContinue, onReview }: { session: IsakSession; onContinue: () => void; onReview: () => void }) {
  const third = sitesNeedingThird(session);
  const isFirst = session.pass === 1 && session.sites.some((sid) => (session.readings[sid]?.length ?? 0) === 1);
  return (
    <View style={styles.breakBody}>
      <View style={styles.breakCard}>
        <Text style={styles.breakTitle}>{isFirst ? 'Ronda 1 completa' : 'Ronda 2 completa'}</Text>
        <Text style={styles.breakText}>
          {isFirst
            ? `${measuredCount(session)} puntos con su primera medida. Ahora la segunda vuelta, en el mismo orden, para comparar.`
            : `${third.length === 1 ? 'Un punto no coincide' : `${third.length} puntos no coinciden`} entre la 1.ª y la 2.ª medida: ${third
                .map((sid) => SITE_BY_ID[sid].short)
                .join(', ')}. Toma una tercera medida de cada uno.`}
        </Text>
        <Button title={isFirst ? 'Empezar la 2.ª ronda' : 'Tomar las terceras medidas'} onPress={onContinue} />
        {!isFirst && <Button title="Revisar sin terceras" variant="ghost" onPress={onReview} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  spinner: { marginTop: s(32) },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: s(12), padding: s(24) },
  error: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.danger, textAlign: 'center' },
  breakBody: { flex: 1, justifyContent: 'center', padding: s(16) },
  breakCard: {
    gap: s(12),
    padding: s(20),
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  breakTitle: { fontFamily: fonts.heading, fontSize: fontSizes.screenTitle, color: colors.navy },
  breakText: { fontFamily: fonts.body, fontSize: fontSizes.sm, lineHeight: lineHeights.sm, color: colors.text },
});
