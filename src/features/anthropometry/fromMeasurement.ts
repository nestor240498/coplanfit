import { ageAt } from '@/lib/format';

import type { MeasurementInput } from '../clients/measurementsRepository';
import type { Client, Measurement } from '../clients/types';
import {
  computeIsak,
  type IsakInput,
  type IsakResults,
  type IsakSession,
  type MeasurementEquations,
  roundTo,
  sessionFinals,
  sessionReadingsJson,
  SITE_IDS,
  type SiteValues,
} from './engine';

/** Valores de los 21 puntos ISAK a partir de una fila de `measurements`. */
export function siteValuesFromMeasurement(m: Measurement): SiteValues {
  const record = m as unknown as Record<string, number | null | undefined>;
  const sites: SiteValues = {};
  for (const id of SITE_IDS) sites[id] = record[id] ?? null;
  // Mediciones antiguas: el brazo relajado se guardaba en arm_cm
  if (sites.arm_right_cm == null && m.arm_cm != null) sites.arm_right_cm = m.arm_cm;
  return sites;
}

/** Entrada del motor: usa el sexo actual del cliente y su edad en la fecha de la medición. */
export function isakInputFromMeasurement(
  m: Measurement,
  client: Pick<Client, 'sex' | 'birth_date' | 'age'>
): IsakInput {
  return {
    sex: client.sex ?? m.equations?.sex ?? null,
    ageYears: ageAt(client.birth_date, m.measured_at) ?? m.equations?.age ?? client.age,
    sites: siteValuesFromMeasurement(m),
    fatEquation: m.equations?.fat ?? null,
    ethnicity: m.equations?.ethnicity ?? 0,
  };
}

export function computeMeasurementResults(
  m: Measurement,
  client: Pick<Client, 'sex' | 'birth_date' | 'age'>
): IsakResults {
  return computeIsak(isakInputFromMeasurement(m, client));
}

/** Entrada del motor para una sesión en curso (vista previa en la revisión). */
export function isakInputFromSession(
  session: IsakSession,
  client: Pick<Client, 'sex' | 'birth_date' | 'age'>
): IsakInput {
  return {
    sex: client.sex ?? null,
    ageYears: ageAt(client.birth_date, session.measuredOn) ?? client.age,
    sites: sessionFinals(session),
    fatEquation: session.fatEquation,
    ethnicity: session.ethnicity,
  };
}

/**
 * Fila a guardar: valores finales por columna, lecturas en bruto, fórmulas usadas y el % de grasa y de
 * músculo calculados (para que la lista, las tendencias y la IA sigan funcionando).
 */
export function sessionToMeasurementInput(
  session: IsakSession,
  client: Pick<Client, 'sex' | 'birth_date' | 'age'>
): MeasurementInput {
  const input = isakInputFromSession(session, client);
  const results = computeIsak(input);
  const finals = input.sites;
  const equations: MeasurementEquations = {
    v: 1,
    fat: results.fat.ok ? results.fat.value.equation : (session.fatEquation ?? null),
    muscle: 'lee2000',
    bone: 'rocha',
    adipose: 'kerr',
    ethnicity: session.ethnicity,
    sex: input.sex,
    age: input.ageYears,
  };
  const row: MeasurementInput = {
    measured_at: session.measuredOn,
    protocol: session.profile === 'skinfolds' ? 'skinfolds' : 'isak_restricted',
    readings: sessionReadingsJson(session),
    equations,
    body_fat_pct: results.fat.ok ? roundTo(results.fat.value.pct, 1) : null,
    muscle_mass_pct: results.muscle.ok && results.muscle.value.pct != null ? roundTo(results.muscle.value.pct, 1) : null,
  };
  for (const id of SITE_IDS) {
    const value = finals[id];
    (row as Record<string, unknown>)[id] = value ?? null;
  }
  // Compatibilidad: el brazo relajado también en la columna antigua
  row.arm_cm = finals.arm_right_cm ?? null;
  return row;
}
