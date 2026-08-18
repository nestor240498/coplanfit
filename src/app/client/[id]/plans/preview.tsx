import { useLocalSearchParams, useRouter } from 'expo-router';
import { Download, Droplets, Pill, Users } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppBackground } from '@/components/ui/AppBackground';
import { Button } from '@/components/ui/Button';
import { CoplanFitLogo } from '@/components/ui/CoplanFitLogo';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { usePlanBuilderStore } from '@/features/clients/planBuilderStore';
import { generateAndSharePlanPdf } from '@/features/clients/planPdf';
import { getPlanVersionById, PlanVersionWithData } from '@/features/clients/plansRepository';
import { getClient } from '@/features/clients/repository';
import { Goal } from '@/features/clients/types';
import { getMyProfile } from '@/features/profile/repository';
import { Profile } from '@/features/profile/types';
import { s } from '@/theme/scale';
import { colors, radius, shadows } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

export default function PlanPreviewScreen() {
  const { id, versionId } = useLocalSearchParams<{ id: string; versionId?: string }>();
  const router = useRouter();
  const [client, setClient] = useState<{ full_name: string; goal: Goal | null } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [savedPlan, setSavedPlan] = useState<PlanVersionWithData | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(Boolean(versionId));
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const store = usePlanBuilderStore();

  useEffect(() => {
    getClient(id).then((c) => setClient({ full_name: c.full_name, goal: c.goal })).catch(() => {});
    getMyProfile().then(setProfile).catch(() => {});

    if (versionId) {
      getPlanVersionById(versionId)
        .then(setSavedPlan)
        .catch((e: Error) => setLoadError(e.message))
        .finally(() => setLoadingPlan(false));
    }
  }, [id, versionId]);

  const mealSlots = savedPlan ? savedPlan.data.mealSlots ?? [] : store.mealSlots;
  const waterLiters = savedPlan ? savedPlan.data.waterLiters : store.waterLiters;
  const supplements = savedPlan ? savedPlan.data.supplements ?? [] : store.supplements;
  const suggestions = savedPlan ? savedPlan.data.suggestions : store.suggestions;
  const mealAssignments = savedPlan ? savedPlan.data.meals ?? {} : store.mealAssignments;

  async function handleDownloadPdf() {
    if (!client) return;
    setGeneratingPdf(true);
    try {
      await generateAndSharePlanPdf({
        client,
        profile,
        planData: {
          mealSlots,
          waterLiters,
          supplements,
          aiNote: savedPlan?.data.aiNote ?? store.aiNote,
          suggestions,
          meals: mealAssignments,
        },
        versionNumber: savedPlan?.version,
        createdAt: savedPlan?.created_at,
      });
    } finally {
      setGeneratingPdf(false);
    }
  }

  const pageTitle = savedPlan ? `Plan Nutricional v${savedPlan.version}` : 'Vista previa del plan';

  return (
    <View style={styles.screen}>
      <AppBackground />
      <ScreenHeader
        title={pageTitle}
        subtitle={client?.full_name ? `Cliente: ${client.full_name}` : 'Plan nutricional'}
        showBack
        showHome
        breadcrumbs={[
          { label: 'Clientes', href: '/', icon: Users },
          { label: client?.full_name || 'Cliente', href: `/client/${id}` },
          { label: savedPlan ? `Versión ${savedPlan.version}` : 'Vista previa' },
        ]}
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Descargar PDF"
            onPress={handleDownloadPdf}
            disabled={generatingPdf}
            style={styles.headerDownloadBtn}
          >
            {generatingPdf ? (
              <ActivityIndicator size="small" color={colors.lime} />
            ) : (
              <Download size={s(16)} color={colors.lime} strokeWidth={2.5} />
            )}
          </Pressable>
        }
      />

      {loadingPlan ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={colors.navy} />
          <Text style={styles.loadingText}>Cargando plan...</Text>
        </View>
      ) : loadError != null ? (
        <View style={styles.centerLoading}>
          <Text style={styles.errorText}>No se pudo cargar la versión del plan: {loadError}</Text>
          <Button title="Reintentar" onPress={() => {
            setLoadingPlan(true);
            setLoadError(null);
            if (versionId) {
              getPlanVersionById(versionId)
                .then(setSavedPlan)
                .catch((e: Error) => setLoadError(e.message))
                .finally(() => setLoadingPlan(false));
            }
          }} style={{ marginTop: s(12) }} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {/* Documento tipo hoja */}
          <View style={styles.documentCard}>
            {/* Header del documento */}
            <View style={styles.docHeader}>
              <CoplanFitLogo variant="on-light" size="sm" showText={false} />
              <View style={styles.docTitleWrap}>
                <Text style={styles.docTitle}>
                  PLAN NUTRICIONAL — {(client?.goal ?? 'PERSONALIZADO').toUpperCase()}
                </Text>
                <Text style={styles.docSubtitle}>
                  {client?.full_name ?? 'Cliente'} · preparado por {profile?.full_name || 'Entrenador'}
                </Text>
              </View>
            </View>

            {/* Tabla de comidas */}
            <View style={styles.table}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableHeaderCell, { flex: 1.1 }]}>COMIDA</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1.4 }]}>OPCIÓN 1</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1.4 }]}>OPCIÓN 2</Text>
              </View>

              {mealSlots.map((slot) => {
                const assignment = mealAssignments[slot.id] ?? { option1: '—', option2: '—' };
                return (
                  <View key={slot.id} style={styles.tableRow}>
                    <View style={{ flex: 1.1 }}>
                      <Text style={styles.mealCellName}>{slot.name}</Text>
                      <Text style={styles.mealCellTime}>{slot.time}</Text>
                    </View>
                    <Text style={[styles.optionCellText, { flex: 1.4 }]}>
                      {assignment.option1 || '—'}
                    </Text>
                    <Text style={[styles.optionCellText, { flex: 1.4 }]}>
                      {assignment.option2 || '—'}
                    </Text>
                  </View>
                );
              })}
            </View>

            <View style={styles.divider} />

            {/* Lista de mercado organizada por macro nutrientes */}
            <View style={styles.sectionWrap}>
              <Text style={styles.docSectionTitle}>LISTA DE MERCADO</Text>
              <View style={styles.marketTable}>
                <View style={styles.marketTableHeader}>
                  <Text style={[styles.marketHeaderCell, { width: '38%' }]}>Macro nutriente</Text>
                  <Text style={[styles.marketHeaderCell, { width: '62%' }]}>Alimento</Text>
                </View>
                {[
                  { key: 'carbohidratos', label: 'Carbohidratos' },
                  { key: 'grasas', label: 'Grasas' },
                  { key: 'proteinas', label: 'Proteínas' },
                  { key: 'vegetales', label: 'Vegetales / Hortalizas' },
                  { key: 'frutas', label: 'Frutas' },
                  { key: 'lacteos', label: 'Lácteos' },
                ].map(({ key, label }) => {
                  const items = (suggestions?.[key as keyof typeof suggestions] ?? []).filter((f) => f && f.checked);
                  if (items.length === 0) return null;
                  return (
                    <View key={key} style={styles.marketTableRow}>
                      <Text style={[styles.marketMacroName, { width: '38%' }]}>{label}</Text>
                      <View style={{ width: '62%', gap: s(2) }}>
                        {items.map((item) => (
                          <Text key={item.id} style={styles.marketFoodItem}>
                            • {item.name}
                          </Text>
                        ))}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Hidratación y suplementos */}
            <View style={styles.sectionWrap}>
              <View style={styles.noteRow}>
                <Droplets size={s(12)} color="#38BDF8" />
                <Text style={styles.notesText}>
                  <Text style={styles.notesTextBold}>Hidratación:</Text> Mínimo {waterLiters || '2.5'} L/día.
                </Text>
              </View>
              {supplements.length > 0 && (
                <View style={styles.noteRow}>
                  <Pill size={s(12)} color="#F87171" />
                  <Text style={styles.notesText}>
                    <Text style={styles.notesTextBold}>Suplementos:</Text>{' '}
                    {supplements.map((s) => `${s.name} (${s.dose} · ${s.scheduleDetail || s.schedule})`).join('; ')}.
                  </Text>
                </View>
              )}
            </View>

            {/* Footer del documento */}
            <View style={styles.docFooter}>
              <Text style={styles.trainerName}>{profile?.full_name || 'Entrenador Personal'}</Text>
              <Text style={styles.trainerRole}>
                {profile?.business_name || 'Personal Trainer'} · Generado con CoplanFit
              </Text>
            </View>
          </View>
        </ScrollView>
      )}

      {/* Footer fijo al pie de la pantalla */}
      <View style={styles.footer}>
        <Button
          title={generatingPdf ? 'Generando PDF…' : 'Descargar en PDF'}
          variant="secondary"
          onPress={handleDownloadPdf}
          loading={generatingPdf}
          style={styles.footerBtnSide}
        />
        <Button
          title="Ficha del cliente"
          onPress={() => router.push(`/client/${id}`)}
          style={styles.footerBtnMain}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { padding: s(12), gap: s(14), alignItems: 'center', paddingBottom: s(24) },
  documentCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: s(14),
    gap: s(10),
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  docHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
    paddingBottom: s(8),
    borderBottomWidth: 1,
    borderBottomColor: '#EEF0F4',
  },
  docLogo: {
    width: s(28),
    height: s(28),
    borderRadius: s(8),
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docLogoText: {
    fontFamily: fonts.heading,
    fontSize: s(11),
    color: colors.lime,
  },
  docTitleWrap: { flex: 1 },
  docTitle: {
    fontFamily: fonts.headingSemi,
    fontSize: fontSizes.xs,
    color: colors.navy,
    letterSpacing: 0.3,
  },
  docSubtitle: {
    fontFamily: fonts.body,
    fontSize: s(9),
    color: colors.textSecondary,
    marginTop: 2,
  },
  table: {
    gap: s(6),
  },
  tableHeaderRow: {
    flexDirection: 'row',
    paddingBottom: s(4),
    borderBottomWidth: 1,
    borderBottomColor: '#EEF0F4',
  },
  tableHeaderCell: {
    fontFamily: fonts.bodyBold,
    fontSize: s(8),
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: s(4),
    borderBottomWidth: 1,
    borderBottomColor: '#F7F8FA',
    gap: s(4),
  },
  mealCellName: {
    fontFamily: fonts.bodyBold,
    fontSize: s(8),
    color: colors.text,
  },
  mealCellTime: {
    fontFamily: fonts.body,
    fontSize: s(8),
    color: colors.textMuted,
  },
  optionCellText: {
    fontFamily: fonts.body,
    fontSize: s(8),
    color: colors.text,
    lineHeight: s(10),
  },
  divider: {
    height: 1,
    backgroundColor: '#EEF0F4',
    marginVertical: s(2),
  },
  sectionWrap: {
    gap: s(15),
  },
  docSectionTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: s(9),
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
  marketTable: {
    borderWidth: 1,
    borderColor: '#EEF0F4',
    borderRadius: radius.input,
    overflow: 'hidden',
  },
  marketTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FB',
    paddingVertical: s(6),
    paddingHorizontal: s(8),
    borderBottomWidth: 1,
    borderBottomColor: '#EEF0F4',
    gap: s(5)
  },
  marketHeaderCell: {
    fontFamily: fonts.bodyBold,
    fontSize: s(8),
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  marketTableRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: s(5),
    paddingVertical: s(6),
    paddingHorizontal: s(8),
    borderBottomWidth: 1,
    borderBottomColor: '#F7F8FA',
  },
  marketMacroName: {
    fontFamily: fonts.bodyBold,
    fontSize: s(8),
    color: colors.text,
  },
  marketFoodItem: {
    fontFamily: fonts.body,
    fontSize: s(9.5),
    color: colors.textSecondary,
    lineHeight: s(13),
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
  },
  notesText: {
    fontFamily: fonts.body,
    fontSize: s(9),
    color: colors.textSecondary,
    lineHeight: s(14),
  },
  notesTextBold: {
    fontFamily: fonts.bodyBold,
    color: colors.text,
  },
  docFooter: {
    borderTopWidth: 1,
    borderTopColor: '#EEF0F4',
    paddingTop: s(8),
    marginTop: s(4),
  },
  trainerName: {
    fontFamily: fonts.bodyBold,
    fontSize: s(10),
    color: colors.text,
  },
  trainerRole: {
    fontFamily: fonts.body,
    fontSize: s(8),
    color: colors.textMuted,
  },
  headerDownloadBtn: {
    padding: s(6),
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(10),
  },
  loadingText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  errorText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.danger,
    textAlign: 'center',
    paddingHorizontal: s(24),
  },
  footer: {
    flexDirection: 'row',
    gap: s(8),
    paddingHorizontal: s(16),
    paddingTop: s(10),
    paddingBottom: s(14),
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerBtnSide: { flex: 1 },
  footerBtnMain: { flex: 1 },
});
