import { Image } from 'expo-image';
import { Camera, Check, ImagePlus, Trash2, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { BottomSheet, SheetFooter } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { DatePickerSheet } from '@/features/clients/components/DatePickerSheet';
import type { Client } from '@/features/clients/types';
import { SelectField } from '@/features/workouts/components/ExerciseFormControls';
import { ageAt, formatDateShort, localDateIso } from '@/lib/format';
import { useRetained } from '@/lib/useRetained';
import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes, lineHeights } from '@/theme/typography';

import {
  aggregateReadings,
  computeIsak,
  DW_MIN_AGE,
  FAT_EQUATION_LABELS,
  type FatEquation,
  fmtEs,
  GROUP_LABELS,
  GROUP_ORDER,
  type IsakResults,
  type IsakSession,
  parseDecimal,
  relativeDiffPct,
  SITE_BY_ID,
  type SiteId,
  siteStatus,
  sitesNeedingThird,
  temByGroup,
  unresolvedSites,
} from '../engine';
import { isakInputFromSession } from '../fromMeasurement';
import { STATUS_LABELS, StatusIcon } from './SessionOverviewSheet';

type Props = {
  session: IsakSession;
  client: Client;
  photos: string[];
  saving: boolean;
  savingStatus: string | null;
  onEditReadings: (siteId: SiteId, readings: number[]) => void;
  onRequestThird: (siteIds: SiteId[]) => void;
  onRetake: (siteIds: SiteId[]) => void;
  onSetMeasuredOn: (iso: string) => void;
  onSetFatEquation: (eq: FatEquation) => void;
  onAddPhoto: (source: 'camera' | 'library') => void;
  onRemovePhoto: (index: number) => void;
  onSave: () => void;
  onDiscard: () => void;
};

/** Revisión antes de guardar: lecturas, calidad de la toma, vista previa de resultados y fotos. */
export function SessionReview(props: Props) {
  const { session, client, photos, saving, savingStatus } = props;
  const [editing, setEditing] = useState<SiteId | null>(null);
  const [editorNonce, setEditorNonce] = useState(0);
  const [dateOpen, setDateOpen] = useState(false);

  const input = isakInputFromSession(session, client);
  const results = computeIsak(input);
  const tem = session.mode === 'guided' ? temByGroup(session.readings) : [];
  const third = sitesNeedingThird(session);
  const unresolved = unresolvedSites(session);
  const missing = unresolved.filter((id) => (session.readings[id]?.length ?? 0) === 0);
  const skipped = session.skipped.filter((id) => (session.readings[id]?.length ?? 0) === 0);
  const today = localDateIso();
  const age = ageAt(client.birth_date, session.measuredOn) ?? client.age;

  const fatOptions = (Object.keys(FAT_EQUATION_LABELS) as FatEquation[])
    .filter((eq) => (eq === 'slaughter' ? age == null || age < 18 : eq === 'dw_siri' ? age == null || age >= DW_MIN_AGE : true))
    .map((eq) => ({ id: eq, label: FAT_EQUATION_LABELS[eq] }));

  function openEditor(id: SiteId) {
    setEditorNonce((n) => n + 1);
    setEditing(id);
  }

  return (
    <View style={styles.flex}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.body}>
        {session.source === 'isakmetry_pdf' && (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              Medidas leídas del informe PDF. Revisa que coincidan con el documento antes de guardar.
            </Text>
          </View>
        )}

        {session.reported && <ReportCheck reported={session.reported} results={results} />}

        {(third.length > 0 || missing.length > 0) && (
          <View style={styles.pendingCard}>
            {third.length > 0 && (
              <>
                <Text style={styles.pendingText}>
                  {third.length === 1 ? '1 punto no coincide' : `${third.length} puntos no coinciden`} y pide una 3.ª medida:{' '}
                  {third.map((id) => SITE_BY_ID[id].short).join(', ')}.
                </Text>
                <Button title="Medir las terceras ahora" onPress={() => props.onRequestThird(third)} />
              </>
            )}
            {missing.length > 0 && (
              <>
                <Text style={styles.pendingText}>
                  Sin medir: {missing.map((id) => SITE_BY_ID[id].short).join(', ')}.
                </Text>
                <Button title="Medirlos ahora" variant="secondary" onPress={() => props.onRetake(missing)} />
              </>
            )}
          </View>
        )}

        {/* Vista previa de resultados */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Vista previa</Text>
          <View style={styles.tiles}>
            <Tile label="% grasa" value={results.fat.ok ? `${fmtEs(results.fat.value.pct, 1)} %` : '—'} />
            <Tile label="Músculo" value={results.muscle.ok ? `${fmtEs(results.muscle.value.kg, 1)} kg` : '—'} />
            <Tile label="Σ 6 pliegues" value={results.sum6.ok ? `${fmtEs(results.sum6.value, 1)} mm` : '—'} />
            <Tile
              label="Somatotipo"
              value={
                results.somatotype.ok
                  ? `${fmtEs(results.somatotype.value.endo, 1)}–${fmtEs(results.somatotype.value.meso, 1)}–${fmtEs(results.somatotype.value.ecto, 1)}`
                  : '—'
              }
            />
          </View>
          {!client.sex && <Text style={styles.warning}>Sin sexo no se calculan el % de grasa ni la masa muscular.</Text>}
          {results.warnings.map((w) => (
            <Text key={w} style={styles.warning}>
              {w}
            </Text>
          ))}
        </View>

        {/* Ajustes */}
        <View style={styles.card}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setEditorNonce((n) => n + 1);
              setDateOpen(true);
            }}
            style={styles.row}
          >
            <Text style={styles.rowLabel}>Fecha de la medición</Text>
            <Text style={styles.rowValue}>{session.measuredOn === today ? 'Hoy' : formatDateShort(session.measuredOn)}</Text>
          </Pressable>
          <SelectField<FatEquation>
            label="Ecuación de % grasa"
            options={fatOptions}
            value={session.fatEquation ?? (results.fat.ok ? results.fat.value.equation : null)}
            onChange={props.onSetFatEquation}
          />
        </View>

        {/* Calidad de la toma */}
        {tem.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Calidad de la toma (ETM)</Text>
            {tem.map((t) => (
              <View key={t.group} style={styles.temRow}>
                <Text style={styles.rowLabel}>{GROUP_LABELS[t.group]}</Text>
                <Text style={[styles.temValue, t.tone === 'good' ? styles.good : t.tone === 'warn' ? styles.warn : styles.bad]}>
                  {fmtEs(t.relativePct, 1)} %{t.absoluteMm != null ? ` · ${fmtEs(t.absoluteMm, 2)} mm` : ''} · {t.label}
                </Text>
              </View>
            ))}
            <Text style={styles.hint}>
              Error técnico de medida entre la 1.ª y la 2.ª lectura. Bueno: ≤ 5 % en pliegues y ≤ 1 % en el resto.
            </Text>
          </View>
        )}

        {/* Medidas por grupo */}
        {GROUP_ORDER.map((group) => {
          const ids = session.sites.filter((id) => SITE_BY_ID[id].group === group);
          if (!ids.length) return null;
          return (
            <View key={group} style={styles.card}>
              <Text style={styles.cardTitle}>{GROUP_LABELS[group]}</Text>
              {ids.map((id) => {
                const site = SITE_BY_ID[id];
                const readings = session.readings[id] ?? [];
                const status = siteStatus(session, id);
                const final = aggregateReadings(readings, site.decimals);
                const diff = readings.length >= 2 ? relativeDiffPct(readings[0], readings[1]) : null;
                return (
                  <Pressable
                    key={id}
                    accessibilityRole="button"
                    accessibilityLabel={`${site.short}: ${final != null ? fmtEs(final, site.decimals) : STATUS_LABELS[status]}. Corregir`}
                    onPress={() => openEditor(id)}
                    style={styles.siteRow}
                  >
                    <StatusIcon status={status} />
                    <View style={styles.flex}>
                      <Text style={styles.siteName}>{site.short}</Text>
                      <Text style={styles.siteReadings}>
                        {readings.length
                          ? `${readings.map((r) => fmtEs(r, site.decimals)).join(' · ')}${diff != null ? ` · dif. ${fmtEs(diff, 1)} %` : ''}`
                          : STATUS_LABELS[status]}
                      </Text>
                    </View>
                    <Text style={styles.siteFinal}>{final != null ? `${fmtEs(final, site.decimals)} ${site.unit}` : '—'}</Text>
                  </Pressable>
                );
              })}
            </View>
          );
        })}
        {skipped.length > 0 && <Text style={styles.hint}>Saltados: {skipped.map((id) => SITE_BY_ID[id].short).join(', ')}.</Text>}

        {/* Fotos */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Fotos de progreso (opcional)</Text>
          <View style={styles.photoActions}>
            <Pressable accessibilityRole="button" onPress={() => props.onAddPhoto('camera')} style={styles.photoBtn}>
              <Camera size={18} color={colors.navy} />
              <Text style={styles.photoBtnText}>Cámara</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => props.onAddPhoto('library')} style={styles.photoBtn}>
              <ImagePlus size={18} color={colors.navy} />
              <Text style={styles.photoBtnText}>Galería</Text>
            </Pressable>
          </View>
          {photos.length > 0 && (
            <View style={styles.thumbs}>
              {photos.map((uri, i) => (
                <View key={uri} style={styles.thumb}>
                  <Image source={{ uri }} style={styles.thumbImage} contentFit="cover" />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Quitar foto"
                    onPress={() => props.onRemovePhoto(i)}
                    style={styles.thumbRemove}
                    hitSlop={8}
                  >
                    <Trash2 size={14} color={colors.surface} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
          <Text style={styles.hint}>Confidenciales: solo las ves tú.</Text>
        </View>

        <Pressable accessibilityRole="button" onPress={props.onDiscard} style={styles.discard}>
          <Text style={styles.discardText}>Descartar evaluación</Text>
        </Pressable>
      </ScrollView>

      <View style={styles.footer}>
        <Button title={saving ? (savingStatus ?? 'Guardando…') : 'Guardar evaluación'} onPress={props.onSave} loading={saving} />
      </View>

      <ReadingsEditorSheet
        key={editorNonce}
        siteId={editing}
        readings={editing ? (session.readings[editing] ?? []) : []}
        onClose={() => setEditing(null)}
        onSave={(values) => {
          if (editing) props.onEditReadings(editing, values);
          setEditing(null);
        }}
      />
      <DatePickerSheet
        key={`date-${editorNonce}`}
        visible={dateOpen}
        initialDateIso={session.measuredOn}
        onClose={() => setDateOpen(false)}
        onSelectDate={(iso) => {
          setDateOpen(false);
          if (iso) props.onSetMeasuredOn(iso > today ? today : iso);
        }}
      />
    </View>
  );
}

const REPORT_CHECKS: { key: string; label: string; unit: string; decimals: number; tolerance: number; get: (r: IsakResults) => number | null }[] = [
  { key: 'fat_pct', label: '% grasa', unit: '%', decimals: 2, tolerance: 0.5, get: (r) => (r.fat.ok ? r.fat.value.pct : null) },
  { key: 'adipose_kg', label: 'Tejido adiposo', unit: 'kg', decimals: 2, tolerance: 0.2, get: (r) => (r.adipose.ok ? r.adipose.value.kg : null) },
  { key: 'muscle_kg', label: 'Tejido muscular', unit: 'kg', decimals: 2, tolerance: 0.2, get: (r) => (r.muscle.ok ? r.muscle.value.kg : null) },
  { key: 'bone_kg', label: 'Tejido óseo', unit: 'kg', decimals: 2, tolerance: 0.2, get: (r) => (r.bone.ok ? r.bone.value.kg : null) },
  { key: 'endo', label: 'Endomorfia', unit: '', decimals: 2, tolerance: 0.05, get: (r) => (r.somatotype.ok ? r.somatotype.value.endo : null) },
  { key: 'meso', label: 'Mesomorfia', unit: '', decimals: 2, tolerance: 0.05, get: (r) => (r.somatotype.ok ? r.somatotype.value.meso : null) },
  { key: 'ecto', label: 'Ectomorfia', unit: '', decimals: 2, tolerance: 0.05, get: (r) => (r.somatotype.ok ? r.somatotype.value.ecto : null) },
  { key: 'sum8', label: 'Σ 8 pliegues', unit: 'mm', decimals: 1, tolerance: 0.15, get: (r) => (r.sum8.ok ? r.sum8.value : null) },
];

/** Compara los resultados que trae el informe importado con los que calcula CoplanFit. */
function ReportCheck({ reported, results }: { reported: Record<string, number | null>; results: IsakResults }) {
  const rows = REPORT_CHECKS.flatMap((c) => {
    const theirs = reported[c.key];
    const ours = c.get(results);
    if (theirs == null || ours == null) return [];
    return [{ ...c, theirs, ours, ok: Math.abs(theirs - ours) <= c.tolerance }];
  });
  if (!rows.length) return null;
  const allOk = rows.every((r) => r.ok);
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Comprobación con el informe</Text>
      <Text style={styles.hint}>
        {allOk
          ? 'Los resultados de CoplanFit coinciden con los del informe: las medidas se leyeron bien.'
          : 'Algún resultado no coincide: revisa las medidas marcadas o la ecuación elegida.'}
      </Text>
      {rows.map((r) => (
        <View key={r.key} style={[styles.checkRow, !r.ok && styles.checkRowBad]} accessibilityLabel={`${r.label}: informe ${fmtEs(r.theirs, r.decimals)}, CoplanFit ${fmtEs(r.ours, r.decimals)}. ${r.ok ? 'Coincide' : 'No coincide'}`}>
          <View style={styles.checkText}>
            <Text style={styles.checkLabel}>{r.label}</Text>
            {!r.ok && <Text style={styles.checkDiff}>El informe dice {fmtEs(r.theirs, r.decimals)}</Text>}
          </View>
          <Text style={[styles.checkValue, r.ok ? styles.good : styles.bad]}>
            {fmtEs(r.ours, r.decimals)}
            {r.unit ? ` ${r.unit}` : ''}
          </Text>
          <View style={styles.checkStatus}>{r.ok ? <Check size={18} color={colors.success} /> : <X size={18} color={colors.danger} />}</View>
        </View>
      ))}
    </View>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

/** Corregir las lecturas de un punto (hasta 3). Vaciar todas las casillas lo deja sin medir. */
function ReadingsEditorSheet({
  siteId,
  readings,
  onClose,
  onSave,
}: {
  siteId: SiteId | null;
  readings: number[];
  onClose: () => void;
  onSave: (values: number[]) => void;
}) {
  // Conserva el punto mientras la hoja sale (el padre pone siteId a null al cerrar)
  const shownId = useRetained(siteId);
  const site = shownId ? SITE_BY_ID[shownId] : null;
  const [values, setValues] = useState<string[]>(() =>
    [0, 1, 2].map((i) => (readings[i] != null && site ? fmtEs(readings[i], site.decimals) : ''))
  );
  const parsed = values.map(parseDecimal);
  const invalid = parsed.some(
    (v, i) => values[i].trim() !== '' && (v == null || !site || v < site.hard[0] || v > site.hard[1])
  );

  return (
    <BottomSheet visible={siteId != null} onClose={onClose} title={site ? site.label : 'Lecturas'}>
      {site && (
        <>
          <Text style={styles.hint}>
            Rango posible: {fmtEs(site.hard[0], 0)}–{fmtEs(site.hard[1], 0)} {site.unit}. Deja vacías las que no quieras usar.
          </Text>
          <View style={styles.editorRow}>
            {values.map((v, i) => (
              <View key={i} style={styles.flex}>
                <Text style={styles.editorLabel}>{i + 1}.ª</Text>
                <TextInput
                  value={v}
                  onChangeText={(text) => setValues((prev) => prev.map((p, j) => (j === i ? text : p)))}
                  keyboardType="decimal-pad"
                  placeholder="—"
                  placeholderTextColor={colors.textMuted}
                  style={styles.editorInput}
                  accessibilityLabel={`Lectura ${i + 1} de ${site.short}`}
                />
              </View>
            ))}
          </View>
          {invalid && <Text style={styles.warning}>Hay un valor fuera de rango.</Text>}
          <SheetFooter
            onCancel={onClose}
            onConfirm={() => onSave(parsed.filter((p): p is number => p != null))}
            confirmLabel="Guardar"
            confirmDisabled={invalid}
          />
        </>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { padding: s(16), gap: s(10), paddingBottom: s(24) },
  notice: { padding: s(12), borderRadius: radius.card, backgroundColor: '#FFF4DB' },
  noticeText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.xs, lineHeight: lineHeights.xs, color: '#7A5200' },
  pendingCard: { gap: s(8), padding: s(14), borderRadius: radius.card, backgroundColor: '#FFF4DB' },
  pendingText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, lineHeight: lineHeights.sm, color: '#5C3D00' },
  card: {
    gap: s(8),
    padding: s(14),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cardTitle: { fontFamily: fonts.heading, fontSize: fontSizes.base, color: colors.navy },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: s(8) },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: s(10), minHeight: 44, paddingVertical: s(6) },
  checkRowBad: { backgroundColor: colors.dangerBg, borderRadius: radius.input, marginHorizontal: -s(8), paddingHorizontal: s(8) },
  checkText: { flex: 1, gap: 2 },
  checkLabel: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.base, color: colors.text },
  checkDiff: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.danger },
  checkValue: { fontFamily: fonts.bodyBold, fontSize: fontSizes.base, textAlign: 'right' },
  checkStatus: { width: s(24), alignItems: 'center' },
  tile: { flexGrow: 1, flexBasis: '45%', padding: s(10), borderRadius: radius.input, backgroundColor: colors.background },
  tileValue: { fontFamily: fonts.heading, fontSize: fontSizes.headline, color: colors.navy },
  tileLabel: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textSecondary },
  warning: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.xs, lineHeight: lineHeights.xs, color: colors.danger },
  hint: { fontFamily: fonts.body, fontSize: fontSizes.xs, lineHeight: lineHeights.xs, color: colors.textSecondary },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48 },
  rowLabel: { fontFamily: fonts.bodySemi, fontSize: fontSizes.sm, color: colors.text },
  rowValue: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.navy },
  temRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: s(8) },
  temValue: { fontFamily: fonts.bodyBold, fontSize: fontSizes.xs },
  good: { color: colors.success },
  warn: { color: '#7A5200' },
  bad: { color: colors.danger },
  siteRow: { flexDirection: 'row', alignItems: 'center', gap: s(10), minHeight: 52 },
  siteName: { fontFamily: fonts.bodySemi, fontSize: fontSizes.sm, color: colors.text },
  siteReadings: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textSecondary },
  siteFinal: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.navy },
  photoActions: { flexDirection: 'row', gap: s(8) },
  photoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(6),
    minHeight: 44,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
  },
  photoBtnText: { fontFamily: fonts.bodySemi, fontSize: fontSizes.sm, color: colors.navy },
  thumbs: { flexDirection: 'row', flexWrap: 'wrap', gap: s(8) },
  thumb: { width: 76, height: 96, borderRadius: radius.input, overflow: 'hidden' },
  thumbImage: { width: '100%', height: '100%' },
  thumbRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(18,32,61,0.7)',
  },
  discard: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: s(12) },
  discardText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.danger },
  footer: { padding: s(14), borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  editorRow: { flexDirection: 'row', gap: s(8) },
  editorLabel: { fontFamily: fonts.bodyBold, fontSize: fontSizes.label, color: colors.textSecondary, marginBottom: s(4) },
  editorInput: {
    minHeight: 48,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    textAlign: 'center',
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.base,
    color: colors.navy,
    backgroundColor: colors.background,
  },
});
