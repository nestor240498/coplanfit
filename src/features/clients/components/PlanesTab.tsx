import { ArrowRight, Check, Clock, Download, Eye, Plus, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { getMyProfile } from '@/features/profile/repository';
import { formatDateShort } from '@/lib/format';
import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

import { generateAndSharePlanPdf } from '../planPdf';
import { getPlanVersionById, PlanVersionWithData } from '../plansRepository';
import { Goal, PlanVersion } from '../types';

type Props = {
  clientId: string;
  clientName: string;
  clientGoal?: Goal | null;
  versions: PlanVersion[];
  draft: PlanVersionWithData | null;
  onNewVersion: () => void;
  onResumeDraft: () => void;
  onDeleteDraft: () => void;
  onCompare: (versionIds: [string, string]) => void;
  onViewVersion: (versionId: string) => void;
};

const MAX_SELECTION = 2;

const STEP_NAMES: Record<number, string> = {
  1: 'Configuración base',
  2: 'Alimentos IA',
  3: 'Asignar comidas',
};

/** Tab Planes: lista de versiones (vigente resaltada), borrador en progreso si existe, selección máx. 2 para comparar. */
export function PlanesTab({
  clientName,
  clientGoal,
  versions,
  draft,
  onNewVersion,
  onResumeDraft,
  onDeleteDraft,
  onCompare,
  onViewVersion,
}: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_SELECTION) return prev;
      return [...prev, id];
    });
  }

  async function handleDownloadVersionPdf(v: PlanVersion) {
    setDownloadingId(v.id);
    try {
      const fullVersion = await getPlanVersionById(v.id);
      const profile = await getMyProfile().catch(() => null);
      await generateAndSharePlanPdf({
        client: { full_name: clientName, goal: clientGoal ?? null },
        profile,
        planData: fullVersion.data,
        versionNumber: v.version,
        createdAt: v.created_at,
      });
    } catch (e) {
      Alert.alert('Error al descargar PDF', (e as Error).message);
    } finally {
      setDownloadingId(null);
    }
  }

  // Filtrar versiones publicadas (no borradores)
  const publishedVersions = versions.filter((v) => !draft || v.id !== draft.id);

  return (
    <View style={styles.container}>
      <View style={styles.contentWrap}>
        {/* Tarjeta de borrador pendiente */}
        {draft && (
          <View style={styles.draftCard}>
            <View style={styles.draftHeader}>
              <View style={styles.draftTagWrap}>
                <View style={styles.draftBadgeRow}>
                  <Clock size={s(12)} color="#D48806" />
                  <Text style={styles.draftTag}>BORRADOR EN PROGRESO</Text>
                </View>
                <Text style={styles.draftStep}>
                  Paso {draft.data.savedStep ?? 1}: {STEP_NAMES[draft.data.savedStep ?? 1]}
                </Text>
              </View>
              <Text style={styles.draftDate}>Guardado {formatDateShort(draft.created_at)}</Text>
            </View>

            <View style={styles.draftActionsColumn}>
              <Pressable onPress={onResumeDraft} style={styles.resumeBtn}>
                <Text style={styles.resumeBtnText}>Continuar editando</Text>
                <ArrowRight size={s(13)} color={colors.lime} strokeWidth={2.5} />
              </Pressable>
              <Pressable onPress={onDeleteDraft} style={styles.discardBtn}>
                <Trash2 size={s(12)} color={colors.danger} />
                <Text style={styles.discardBtnText}>Descartar borrador</Text>
              </Pressable>
            </View>
          </View>
        )}

        <Pressable onPress={onNewVersion} style={styles.newVersionCta}>
          <Plus size={s(14)} color={colors.success} strokeWidth={2.5} />
          <Text style={styles.newVersionText}>Nueva versión del plan</Text>
        </Pressable>

        {publishedVersions.length === 0 ? (
          <Text style={styles.empty}>Aún no hay versiones de plan publicadas para este cliente.</Text>
        ) : (
          <>
            <Text style={styles.hint}>Máximo 2 selecciones — desmarca una para elegir otra</Text>
            {publishedVersions.map((v) => {
              const isSelected = selected.includes(v.id);
              const disabled = !isSelected && selected.length >= MAX_SELECTION;
              const isDownloading = downloadingId === v.id;

              return (
                <View
                  key={v.id}
                  style={[styles.row, isSelected && styles.rowSelected, disabled && styles.rowDisabled]}
                >
                  {/* Checkbox para comparar */}
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityLabel={`Seleccionar versión ${v.version} para comparar`}
                    onPress={() => toggle(v.id)}
                    disabled={disabled}
                    style={styles.checkboxTouch}
                  >
                    <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                      {isSelected && <Check size={s(12)} color={colors.surface} strokeWidth={3} />}
                    </View>
                  </Pressable>

                  {/* Información de la versión */}
                  <Pressable
                    onPress={() => onViewVersion(v.id)}
                    style={styles.rowText}
                  >
                    <View style={styles.rowTitleLine}>
                      <Text style={styles.rowTitle}>Versión {v.version}</Text>
                      {v.is_current && (
                        <View style={styles.currentBadge}>
                          <Text style={styles.currentBadgeText}>Vigente</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.rowDate}>Desde {formatDateShort(v.created_at)}</Text>
                  </Pressable>

                  {/* Acciones directas: Ver (Ojo) y Descargar PDF */}
                  <View style={styles.actionButtonsRow}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Ver plan"
                      onPress={() => onViewVersion(v.id)}
                      hitSlop={8}
                      style={styles.iconBtn}
                    >
                      <Eye size={s(16)} color={colors.navy} />
                    </Pressable>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Descargar plan en PDF"
                      onPress={() => handleDownloadVersionPdf(v)}
                      disabled={isDownloading}
                      hitSlop={8}
                      style={styles.iconBtn}
                    >
                      {isDownloading ? (
                        <ActivityIndicator size="small" color={colors.success} />
                      ) : (
                        <Download size={s(16)} color={colors.success} />
                      )}
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </>
        )}
      </View>

      {publishedVersions.length > 0 && (
        <View style={styles.footerWrap}>
          <Pressable
            disabled={selected.length !== MAX_SELECTION}
            onPress={() => onCompare(selected as [string, string])}
            style={[styles.compareCta, selected.length !== MAX_SELECTION && styles.compareCtaDisabled]}
          >
            <Text style={styles.compareCtaText}>Comparar seleccionadas ({selected.length})</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: s(16),
    justifyContent: 'space-between',
    gap: s(12),
  },
  contentWrap: {
    gap: s(8),
  },
  footerWrap: {
    marginTop: s(16),
    paddingBottom: s(8),
  },
  newVersionCta: {
    height: s(36),
    flexDirection: 'row',
    gap: s(6),
    borderRadius: radius.input,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newVersionText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.success },
  hint: { fontFamily: fonts.body, fontSize: fontSizes.label, color: colors.textMuted, marginTop: s(2) },
  empty: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: s(20),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: s(10),
    borderWidth: 1,
    borderColor: 'transparent',
  },
  rowSelected: { borderColor: colors.lime },
  rowDisabled: { opacity: 0.5 },
  checkbox: {
    width: s(16),
    height: s(16),
    borderRadius: s(4),
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.lime,
    borderColor: colors.lime,
  },
  checkboxTouch: {
    padding: s(4),
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(4),
  },
  iconBtn: {
    width: s(25),
    height: s(25),
    borderRadius: s(5),
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, gap: 2, paddingVertical: s(2) },
  rowTitleLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowTitle: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.text },
  rowDate: { fontFamily: fonts.body, fontSize: fontSizes.label, color: colors.textMuted },
  currentBadge: {
    backgroundColor: colors.successBg,
    borderRadius: radius.chip,
    paddingVertical: 2,
    paddingHorizontal: s(8),
  },
  currentBadgeText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.label, color: colors.success },
  draftCard: {
    backgroundColor: '#FFFBE6',
    borderRadius: radius.card,
    padding: s(12),
    borderWidth: 1,
    borderColor: '#FFE58F',
    gap: s(8),
    marginTop: s(8),
    marginBottom: s(6),
  },
  draftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  draftTagWrap: { flex: 1, gap: 2 },
  draftBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(4),
  },
  draftTag: {
    fontFamily: fonts.headingSemi,
    fontSize: s(7),
    color: '#D48806',
    letterSpacing: 0.2,
  },
  draftStep: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.xs,
    color: colors.navy,
  },
  draftDate: {
    fontFamily: fonts.body,
    fontSize: s(8),
    color: colors.textMuted,
  },
  draftActionsColumn: {
    gap: s(6),
    marginTop: s(4),
  },
  resumeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(6),
    height: s(36),
    borderRadius: radius.input,
    backgroundColor: colors.navy,
    paddingHorizontal: s(12),
  },
  resumeBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: s(10),
    color: colors.lime,
  },
  discardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(5),
    height: s(36),
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: '#D9D9D9',
    backgroundColor: colors.surface,
    paddingHorizontal: s(12),
  },
  discardBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: s(10),
    color: colors.danger,
  },
  compareCta: {
    height: s(38),
    borderRadius: radius.button,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: s(4),
  },
  compareCtaDisabled: { opacity: 0.5 },
  compareCtaText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.navy },
});
