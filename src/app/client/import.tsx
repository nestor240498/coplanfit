import { useRouter } from 'expo-router';
import { Check, CircleAlert, CircleX, Copy, FileDown, FileSpreadsheet, ShieldCheck, Users } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { AppBackground } from '@/components/ui/AppBackground';
import { Button } from '@/components/ui/Button';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { toast } from '@/components/ui/Toast';
import {
  autoMapColumns,
  buildRows,
  type DateOrder,
  detectDateOrder,
  detectHeaderRow,
  type ExistingClient,
  FIELD_LABELS,
  type FieldId,
  type ParsedRow,
  type RowStatus,
} from '@/features/clients/import/core';
import { importClients, listClientIdentities, undoImport } from '@/features/clients/import/importRepository';
import { pickSpreadsheet, type SpreadsheetFile } from '@/features/clients/import/readSpreadsheet';
import { shareImportTemplate } from '@/features/clients/import/templateFile';
import { SelectField, SingleChoice } from '@/features/workouts/components/ExerciseFormControls';
import { friendlyError } from '@/lib/errors';
import { localDateIso } from '@/lib/format';
import { hapticSuccess } from '@/lib/motion';
import { formatPhone } from '@/lib/phone';
import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes, lineHeights } from '@/theme/typography';

type Step = 'file' | 'columns' | 'review' | 'done';
type Filter = 'all' | 'warnings' | 'duplicates' | 'skipped';

const FIELD_OPTIONS = (Object.keys(FIELD_LABELS) as FieldId[]).map((id) => ({ id, label: FIELD_LABELS[id] }));

const PREFIXES = [
  { id: '58', label: '+58 Venezuela' },
  { id: '57', label: '+57 Colombia' },
  { id: '34', label: '+34 España' },
  { id: '52', label: '+52 México' },
  { id: '51', label: '+51 Perú' },
  { id: '56', label: '+56 Chile' },
  { id: '54', label: '+54 Argentina' },
  { id: '593', label: '+593 Ecuador' },
  { id: '507', label: '+507 Panamá' },
  { id: '1', label: '+1 EE. UU.' },
];

const STATUS_LABELS: Record<RowStatus, string> = {
  ok: 'Lista',
  warning: 'Con avisos',
  error: 'No se puede importar',
  duplicate: 'Duplicado',
  possible_duplicate: 'Posible duplicado',
  repeated: 'Repetido',
};

/** Importar clientes desde Excel o CSV: el archivo se lee en el dispositivo y se importa en una sola operación. */
export default function ImportClientsScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('file');
  const [file, setFile] = useState<SpreadsheetFile | null>(null);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [headerRow, setHeaderRow] = useState(0);
  const [mapping, setMapping] = useState<FieldId[]>([]);
  const [dateOrder, setDateOrder] = useState<DateOrder>('dmy');
  const [dateAmbiguous, setDateAmbiguous] = useState(false);
  const [prefix, setPrefix] = useState('58');
  const [existing, setExisting] = useState<ExistingClient[]>([]);
  const [overrides, setOverrides] = useState<Record<number, boolean>>({});
  const [filter, setFilter] = useState<Filter>('all');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ importId: string; imported: number; skipped: number } | null>(null);

  useEffect(() => {
    listClientIdentities().then(setExisting).catch(() => {});
  }, []);

  const table = file?.sheets[sheetIndex]?.table ?? null;
  const headers = table?.rows[headerRow] ?? [];
  const columnCells = (col: number) => (table ? table.rows.slice(headerRow + 1).map((r) => r[col] ?? { text: '' }) : []);

  function prepareSheet(next: SpreadsheetFile, index: number) {
    const t = next.sheets[index].table;
    const hr = detectHeaderRow(t.rows);
    const cols = t.rows[hr].map((_, i) => t.rows.slice(hr + 1).map((r) => r[i] ?? { text: '' }));
    const map = autoMapColumns(t.rows[hr], cols);
    const dateCells = map.flatMap((f, i) => (f === 'birth_date' || f === 'measured_at' ? cols[i] : []));
    const detected = detectDateOrder(dateCells);
    setSheetIndex(index);
    setHeaderRow(hr);
    setMapping(map);
    setDateOrder(detected.order);
    setDateAmbiguous(detected.ambiguous && dateCells.length > 0);
    setOverrides({});
  }

  async function handlePick() {
    setBusy(true);
    try {
      const picked = await pickSpreadsheet();
      if (!picked) return;
      setFile(picked);
      prepareSheet(picked, 0);
      setStep('columns');
    } catch (e) {
      Alert.alert('No se pudo leer el archivo', friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleTemplate() {
    try {
      await shareImportTemplate();
    } catch (e) {
      Alert.alert('No se pudo crear la plantilla', friendlyError(e));
    }
  }

  const rows: ParsedRow[] =
    table && step !== 'file'
      ? buildRows(table, headerRow, mapping, { dateOrder, defaultPrefix: prefix, existing, today: localDateIso() }).map((row) => ({
          ...row,
          include: row.payload != null && (overrides[row.line] ?? row.include),
        }))
      : [];
  const selected = rows.filter((r) => r.include && r.payload);
  const hasName = mapping.includes('full_name') || mapping.includes('first_name');

  async function handleImport() {
    if (!file || !selected.length) return;
    setBusy(true);
    try {
      const res = await importClients(file.fileName, selected.map((r) => r.payload!));
      hapticSuccess();
      setResult({ importId: res.importId, imported: res.clientIds.length, skipped: rows.length - selected.length });
      setStep('done');
    } catch (e) {
      Alert.alert('No se pudo importar', friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  function handleUndo() {
    if (!result) return;
    Alert.alert('¿Deshacer la importación?', `Se borrarán los ${result.imported} clientes importados y sus datos.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Deshacer',
        style: 'destructive',
        onPress: async () => {
          try {
            const removed = await undoImport(result.importId);
            toast(`Importación deshecha: ${removed} clientes borrados.`);
            setResult(null);
            setFile(null);
            setStep('file');
            listClientIdentities().then(setExisting).catch(() => {});
          } catch (e) {
            Alert.alert('No se pudo deshacer', friendlyError(e));
          }
        },
      },
    ]);
  }

  const counts = {
    ok: rows.filter((r) => r.include).length,
    warnings: rows.filter((r) => r.status === 'warning').length,
    duplicates: rows.filter((r) => ['duplicate', 'possible_duplicate', 'repeated'].includes(r.status)).length,
    skipped: rows.filter((r) => !r.include).length,
  };
  const visible = rows.filter((r) =>
    filter === 'all'
      ? true
      : filter === 'warnings'
        ? r.status === 'warning' || r.status === 'error'
        : filter === 'duplicates'
          ? ['duplicate', 'possible_duplicate', 'repeated'].includes(r.status)
          : !r.include
  );

  return (
    <View style={styles.screen}>
      <AppBackground />
      <ScreenHeader
        title="Importar clientes"
        subtitle={file?.fileName ?? 'Desde Excel o CSV'}
        showBack
        breadcrumbs={[{ label: 'Clientes', href: '/', icon: Users }, { label: 'Importar' }]}
      />

      {step === 'file' && (
        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.card}>
            <FileSpreadsheet size={28} color={colors.navy} />
            <Text style={styles.title}>Trae tu cartera de clientes</Text>
            <Text style={styles.text}>
              Elige un Excel (.xlsx, .xls), un archivo de Numbers u OpenOffice, o un CSV. Una fila por cliente: nombre, teléfono,
              fecha de nacimiento, sexo, objetivo, alergias… Las columnas pueden estar en cualquier orden: después revisas a qué
              corresponde cada una.
            </Text>
            <Button title={busy ? 'Leyendo…' : 'Elegir archivo'} onPress={handlePick} loading={busy} />
          </View>
          <Pressable accessibilityRole="button" onPress={handleTemplate} style={styles.linkRow}>
            <FileDown size={20} color={colors.navy} />
            <View style={styles.flex}>
              <Text style={styles.linkTitle}>Descargar plantilla de Excel</Text>
              <Text style={styles.hint}>Con las columnas y dos ejemplos, por si empiezas de cero.</Text>
            </View>
          </Pressable>
          <View style={styles.privacy}>
            <ShieldCheck size={18} color={colors.success} />
            <Text style={styles.privacyText}>El archivo se lee en tu dispositivo: no se sube a ningún sitio. Solo se guardan los clientes que importes.</Text>
          </View>
        </ScrollView>
      )}

      {step === 'columns' && file && table && (
        <>
          <ScrollView contentContainerStyle={styles.body}>
            {file.sheets.length > 1 && (
              <View style={styles.card}>
                <Text style={styles.sectionLabel}>Hoja</Text>
                <SingleChoice
                  options={file.sheets.map((sh, i) => ({ id: String(i), label: sh.name }))}
                  value={String(sheetIndex)}
                  onChange={(v) => prepareSheet(file, Number(v))}
                />
              </View>
            )}
            <Text style={styles.text}>
              {table.rows.length - headerRow - 1} filas. Revisa a qué dato corresponde cada columna; las que no necesites, márcalas como «No importar».
            </Text>
            {headers.map((header, col) => {
              const samples = columnCells(col).map((c) => c.text).filter(Boolean).slice(0, 2);
              return (
                <View key={col} style={styles.columnCard}>
                  <Text style={styles.columnHeader}>{header.text || `Columna ${col + 1}`}</Text>
                  {samples.length > 0 && <Text style={styles.hint}>Ej.: {samples.join(' · ')}</Text>}
                  <SelectField<FieldId>
                    label="Corresponde a"
                    options={FIELD_OPTIONS}
                    value={mapping[col] ?? 'ignore'}
                    onChange={(field) => setMapping((prev) => prev.map((f, i) => (i === col ? field : f)))}
                    sheetTitle={header.text || `Columna ${col + 1}`}
                  />
                </View>
              );
            })}
            {(mapping.includes('birth_date') || mapping.includes('measured_at')) && (
              <View style={styles.card}>
                <Text style={styles.sectionLabel}>Formato de las fechas</Text>
                <SingleChoice<DateOrder>
                  options={[
                    { id: 'dmy', label: 'Día/mes/año' },
                    { id: 'mdy', label: 'Mes/día/año' },
                  ]}
                  value={dateOrder}
                  onChange={setDateOrder}
                />
                {dateAmbiguous && <Text style={styles.hint}>No se puede saber por las fechas del archivo: se asume día/mes/año.</Text>}
              </View>
            )}
            {mapping.includes('phone') && (
              <View style={styles.card}>
                <SelectField label="Prefijo para teléfonos sin prefijo" options={PREFIXES} value={prefix} onChange={setPrefix} />
              </View>
            )}
          </ScrollView>
          <View style={styles.footer}>
            <Button title={hasName ? 'Revisar clientes' : 'Indica qué columna es el nombre'} onPress={() => setStep('review')} disabled={!hasName} />
          </View>
        </>
      )}

      {step === 'review' && (
        <>
          <View style={styles.reviewHeader}>
            <Text style={styles.text}>
              {counts.ok} se importarán · {counts.warnings} con avisos · {counts.duplicates} duplicados · {counts.skipped} omitidas
            </Text>
            <SingleChoice<Filter>
              options={[
                { id: 'all', label: 'Todas' },
                { id: 'warnings', label: 'Avisos' },
                { id: 'duplicates', label: 'Duplicados' },
                { id: 'skipped', label: 'Omitidas' },
              ]}
              value={filter}
              onChange={setFilter}
            />
          </View>
          <FlatList
            data={visible}
            keyExtractor={(r) => String(r.line)}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<Text style={styles.empty}>Nada en este filtro.</Text>}
            renderItem={({ item }) => (
              <View style={[styles.rowCard, !item.include && styles.rowExcluded]}>
                <View style={styles.rowTop}>
                  <StatusIcon status={item.status} />
                  <View style={styles.flex}>
                    <Text style={styles.rowName}>{item.payload?.full_name ?? `Fila ${item.line}`}</Text>
                    <Text style={styles.rowMeta}>
                      {[
                        `Fila ${item.line}`,
                        STATUS_LABELS[item.status],
                        item.payload?.phone ? formatPhone(item.payload.phone) : null,
                        item.payload?.birth_date ?? (item.payload?.age ? `${item.payload.age} años` : null),
                        item.payload?.sex === 'hombre' ? 'Hombre' : item.payload?.sex === 'mujer' ? 'Mujer' : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  </View>
                  {item.payload && (
                    <Switch
                      value={item.include}
                      onValueChange={(v) => setOverrides((prev) => ({ ...prev, [item.line]: v }))}
                      trackColor={{ true: colors.lime, false: colors.border }}
                      accessibilityLabel={`Importar ${item.payload.full_name}`}
                    />
                  )}
                </View>
                {item.issues.map((issue) => (
                  <Text key={issue} style={styles.issue}>
                    {issue}
                  </Text>
                ))}
              </View>
            )}
          />
          <View style={[styles.footer, styles.footerRow]}>
            <Button title="Columnas" variant="secondary" onPress={() => setStep('columns')} style={styles.footerSide} />
            <Button
              title={busy ? 'Importando…' : `Importar ${selected.length} ${selected.length === 1 ? 'cliente' : 'clientes'}`}
              onPress={handleImport}
              loading={busy}
              disabled={!selected.length}
              style={styles.flex}
            />
          </View>
        </>
      )}

      {step === 'done' && result && (
        <View style={styles.doneBody}>
          <View style={styles.card}>
            <Check size={32} color={colors.success} strokeWidth={3} />
            <Text style={styles.title}>{result.imported} {result.imported === 1 ? 'cliente importado' : 'clientes importados'}</Text>
            {result.skipped > 0 && <Text style={styles.text}>{result.skipped} filas omitidas (duplicados o sin nombre).</Text>}
            <Text style={styles.text}>Ya aparecen en tu lista. Completa cada ficha cuando los veas.</Text>
            <Button title="Ver clientes" onPress={() => router.dismissTo('/')} />
            <Button title="Deshacer importación" variant="ghost" onPress={handleUndo} />
          </View>
        </View>
      )}

      {busy && step === 'file' && <ActivityIndicator style={styles.spinner} color={colors.navy} />}
    </View>
  );
}

function StatusIcon({ status }: { status: RowStatus }) {
  if (status === 'ok') return <Check size={18} color={colors.success} strokeWidth={3} />;
  if (status === 'warning') return <CircleAlert size={18} color={colors.warning} />;
  if (status === 'error') return <CircleX size={18} color={colors.danger} />;
  return <Copy size={18} color={colors.textMuted} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  spinner: { marginTop: s(16) },
  body: { padding: s(16), gap: s(10), paddingBottom: s(24) },
  card: {
    gap: s(10),
    padding: s(16),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  title: { fontFamily: fonts.heading, fontSize: fontSizes.headline, color: colors.navy },
  text: { fontFamily: fonts.body, fontSize: fontSizes.sm, lineHeight: lineHeights.sm, color: colors.text },
  hint: { fontFamily: fonts.body, fontSize: fontSizes.xs, lineHeight: lineHeights.xs, color: colors.textSecondary },
  sectionLabel: { fontFamily: fonts.bodyBold, fontSize: fontSizes.label, color: colors.textSecondary, textTransform: 'uppercase' },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(12),
    minHeight: 60,
    padding: s(14),
    borderRadius: radius.card,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.navy,
  },
  linkTitle: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.navy },
  privacy: { flexDirection: 'row', gap: s(8), padding: s(12), borderRadius: radius.card, backgroundColor: colors.successBg },
  privacyText: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: fontSizes.xs, lineHeight: lineHeights.xs, color: colors.success },
  columnCard: {
    gap: s(6),
    padding: s(12),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  columnHeader: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.navy },
  reviewHeader: { gap: s(8), paddingHorizontal: s(16), paddingTop: s(12) },
  list: { padding: s(16), gap: s(8), paddingBottom: s(24) },
  empty: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary, textAlign: 'center', marginTop: s(20) },
  rowCard: {
    gap: s(4),
    padding: s(12),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  rowExcluded: { opacity: 0.6 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: s(10) },
  rowName: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.text },
  rowMeta: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textSecondary },
  issue: { fontFamily: fonts.body, fontSize: fontSizes.xs, lineHeight: lineHeights.xs, color: '#7A5200', marginLeft: s(28) },
  footer: { padding: s(14), borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  footerRow: { flexDirection: 'row', gap: s(8) },
  footerSide: { flex: 0.6 },
  doneBody: { flex: 1, justifyContent: 'center', padding: s(16) },
});
