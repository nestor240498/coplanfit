import {
  carterFatPct,
  JACKSON_POLLOCK_7_SITES,
  jacksonPollock3Sites,
  jacksonPollockDensity,
  correctedGirth,
  defaultFatEquation,
  durninWomersleyDensity,
  DW_MAX_AGE,
  DW_MIN_AGE,
  faulknerFatPct,
  kerrAdiposeKg,
  leeMuscleKg,
  rochaBoneKg,
  siriFatPct,
  slaughterFatPct,
} from './composition.ts';
import {
  bmiBand,
  conicityBand,
  cormicBand,
  manouvrierBand,
  muscleBoneBand,
  relativeSpanBand,
  waistHeightBand,
  waistHipBand,
} from './indices.ts';
import { phantomRows } from './phantom.ts';
import { crossCheck } from './plausibility.ts';
import { ectomorphy, endomorphy, mesomorphy, somatochartXY, somatotypeCategory, somatotypeCategoryLabel } from './somatotype.ts';
import type {
  Block,
  FatEquation,
  FatResult,
  IsakInput,
  IsakResults,
  MassPart,
  Sex,
  SiteId,
  SiteValues,
  Somatotype,
  ValueWithBand,
} from './types.ts';

type Need = ('sex' | 'age')[];

/** Valores positivos de los puntos pedidos, o la lista de los que faltan. */
function pick(sites: SiteValues, ids: SiteId[]): { values: Record<SiteId, number>; missing: SiteId[] } {
  const values = {} as Record<SiteId, number>;
  const missing: SiteId[] = [];
  for (const id of ids) {
    const v = sites[id];
    if (v == null || !Number.isFinite(v) || v <= 0) missing.push(id);
    else values[id] = v;
  }
  return { values, missing };
}

function missingBlock<T>(missing: SiteId[], needs: Need = [], reason?: string): Block<T> {
  return { ok: false, missing, needs, reason };
}

function ok<T>(value: T): Block<T> {
  return { ok: true, value };
}

const FAT_SITES: Record<Exclude<FatEquation, 'jp3'>, SiteId[]> = {
  dw_siri: ['biceps_mm', 'triceps_mm', 'subscapular_mm', 'suprailiac_mm'],
  faulkner: ['triceps_mm', 'subscapular_mm', 'supraspinal_mm', 'abdominal_mm'],
  carter: ['triceps_mm', 'subscapular_mm', 'supraspinal_mm', 'abdominal_mm', 'thigh_mm', 'calf_mm'],
  slaughter: ['triceps_mm', 'calf_mm'],
  jp7: JACKSON_POLLOCK_7_SITES,
};

/** Puntos que usa una ecuación (Jackson-Pollock de 3 pliegues depende del sexo). */
function fatSites(equation: FatEquation, sex: Sex | null): SiteId[] {
  return equation === 'jp3' ? jacksonPollock3Sites(sex ?? 'hombre') : FAT_SITES[equation];
}

const SUM6: SiteId[] = ['triceps_mm', 'subscapular_mm', 'supraspinal_mm', 'abdominal_mm', 'thigh_mm', 'calf_mm'];
const SUM8: SiteId[] = [...SUM6, 'biceps_mm', 'suprailiac_mm'];

function sumOf(values: Record<SiteId, number>, ids: SiteId[]): number {
  return ids.reduce((acc, id) => acc + values[id], 0);
}

/** % grasa con una ecuación concreta (sin masa: solo el porcentaje y la densidad). */
function fatPct(
  equation: FatEquation,
  input: IsakInput
): Block<{ pct: number; density: number | null }> {
  const ids = fatSites(equation, input.sex);
  const { values, missing } = pick(input.sites, ids);
  const needs: Need = [];
  if (!input.sex) needs.push('sex');
  if ((equation === 'dw_siri' || equation === 'jp3' || equation === 'jp7') && input.ageYears == null) needs.push('age');
  if (missing.length || needs.length) return missingBlock(missing, needs);
  const sex = input.sex!;
  const total = sumOf(values, ids);
  switch (equation) {
    case 'dw_siri': {
      const density = durninWomersleyDensity(sex, Math.max(input.ageYears!, DW_MIN_AGE), total);
      return ok({ pct: siriFatPct(density), density });
    }
    case 'jp3':
    case 'jp7': {
      const density = jacksonPollockDensity(equation === 'jp3' ? 3 : 7, sex, input.ageYears!, total);
      return ok({ pct: siriFatPct(density), density });
    }
    case 'faulkner':
      return ok({ pct: faulknerFatPct(sex, total), density: null });
    case 'carter':
      return ok({ pct: carterFatPct(sex, total), density: null });
    case 'slaughter':
      return ok({ pct: slaughterFatPct(sex, total), density: null });
  }
}

function massPart(kg: number, weight: number | undefined): MassPart {
  return { kg, pct: weight ? (kg / weight) * 100 : null };
}

/**
 * Calcula todo el informe ISAK a partir de los valores finales. Cada resultado es un bloque
 * independiente: si falta una medida, solo se pierde lo que depende de ella.
 */
export function computeIsak(input: IsakInput): IsakResults {
  const s = input.sites;
  const sex = input.sex;
  const age = input.ageYears;
  const ethnicity = input.ethnicity ?? 0;
  const weight = s.weight_kg && s.weight_kg > 0 ? s.weight_kg : undefined;
  const height = s.height_cm && s.height_cm > 0 ? s.height_cm : undefined;
  const warnings: string[] = [];

  // Sumatorios
  const p6 = pick(s, SUM6);
  const sum6: Block<number> = p6.missing.length ? missingBlock(p6.missing) : ok(sumOf(p6.values, SUM6));
  const p8 = pick(s, SUM8);
  const sum8: Block<number> = p8.missing.length ? missingBlock(p8.missing) : ok(sumOf(p8.values, SUM8));

  // IMC
  const pBmi = pick(s, ['weight_kg', 'height_cm']);
  const bmi = pBmi.missing.length
    ? missingBlock<ValueWithBand>(pBmi.missing)
    : (() => {
        const value = pBmi.values.weight_kg / (pBmi.values.height_cm / 100) ** 2;
        return ok({ value, band: age != null && age < 18 ? null : bmiBand(value) });
      })();

  // % grasa (2 componentes)
  const equation = input.fatEquation ?? defaultFatEquation(age);
  const fatBase = fatPct(equation, input);
  const fat: Block<FatResult> = fatBase.ok
    ? ok({
        equation,
        density: fatBase.value.density,
        pct: fatBase.value.pct,
        fatKg: weight ? (fatBase.value.pct / 100) * weight : null,
        ffmKg: weight ? weight - (fatBase.value.pct / 100) * weight : null,
      })
    : fatBase;
  const fatAlternatives: { equation: FatEquation; pct: number }[] = [];
  for (const eq of ['dw_siri', 'faulkner', 'carter', 'slaughter', 'jp3', 'jp7'] as FatEquation[]) {
    if (eq === 'slaughter' && age != null && age >= 18) continue;
    if (eq === 'dw_siri' && age != null && age < DW_MIN_AGE) continue;
    const r = fatPct(eq, input);
    if (r.ok) fatAlternatives.push({ equation: eq, pct: r.value.pct });
  }
  if (equation === 'dw_siri' && age != null && age > DW_MAX_AGE) {
    warnings.push(`Durnin-Womersley se desarrolló con personas de 16 a ${DW_MAX_AGE} años: interpreta el % de grasa con cautela.`);
  }
  if (age != null && age < 18) {
    warnings.push('Los modelos de tejidos (Kerr, Lee, Rocha) se desarrollaron con adultos: interprétalos con cautela.');
  }

  // Perímetros corregidos
  const pCorr = pick(s, ['arm_right_cm', 'triceps_mm', 'thigh_right_cm', 'thigh_mm', 'calf_right_cm', 'calf_mm']);
  const correctedGirths = pCorr.missing.length
    ? missingBlock<{ arm: number; thigh: number; calf: number }>(pCorr.missing)
    : ok({
        arm: correctedGirth(pCorr.values.arm_right_cm, pCorr.values.triceps_mm),
        thigh: correctedGirth(pCorr.values.thigh_right_cm, pCorr.values.thigh_mm),
        calf: correctedGirth(pCorr.values.calf_right_cm, pCorr.values.calf_mm),
      });

  // Tejidos (fraccionamiento de Kerr + Lee + Rocha)
  const adipose: Block<MassPart> = sum6.ok && height
    ? ok(massPart(kerrAdiposeKg(sum6.value, height), weight))
    : missingBlock([...(sum6.ok ? [] : sum6.missing), ...(height ? [] : (['height_cm'] as SiteId[]))]);

  const muscleNeeds: Need = [];
  if (!sex) muscleNeeds.push('sex');
  if (age == null) muscleNeeds.push('age');
  const muscle: Block<MassPart> =
    correctedGirths.ok && height && muscleNeeds.length === 0
      ? ok(
          massPart(
            leeMuscleKg({
              heightCm: height,
              correctedArm: correctedGirths.value.arm,
              correctedThigh: correctedGirths.value.thigh,
              correctedCalf: correctedGirths.value.calf,
              sex: sex!,
              age: age!,
              ethnicity,
            }),
            weight
          )
        )
      : missingBlock(
          [...(correctedGirths.ok ? [] : correctedGirths.missing), ...(height ? [] : (['height_cm'] as SiteId[]))],
          muscleNeeds
        );

  const pBone = pick(s, ['height_cm', 'wrist_breadth_cm', 'femur_breadth_cm']);
  const bone: Block<MassPart> = pBone.missing.length
    ? missingBlock(pBone.missing)
    : ok(massPart(rochaBoneKg(pBone.values.height_cm, pBone.values.wrist_breadth_cm, pBone.values.femur_breadth_cm), weight));

  let residual: Block<MassPart>;
  if (adipose.ok && muscle.ok && bone.ok && weight) {
    const kg = weight - adipose.value.kg - muscle.value.kg - bone.value.kg;
    if (kg < 0) {
      warnings.push('La suma de tejidos supera la masa corporal: revisa las medidas (residual negativo).');
      residual = missingBlock([], [], 'La suma de tejidos supera la masa corporal.');
    } else {
      residual = ok(massPart(kg, weight));
    }
  } else {
    const missing = new Set<SiteId>();
    for (const b of [adipose, muscle, bone]) if (!b.ok) b.missing.forEach((m) => missing.add(m));
    if (!weight) missing.add('weight_kg');
    const needs = new Set<'sex' | 'age'>();
    for (const b of [adipose, muscle, bone]) if (!b.ok) b.needs.forEach((n) => needs.add(n));
    residual = missingBlock([...missing], [...needs]);
  }

  // Índices adiposo-muscular y músculo-óseo
  const adiposeMuscleIndex: Block<number> =
    adipose.ok && muscle.ok ? ok(adipose.value.kg / muscle.value.kg) : missingBlock(unionMissing(adipose, muscle), unionNeeds(adipose, muscle));
  const muscleBoneIndex = muscle.ok && bone.ok
    ? ok({ value: muscle.value.kg / bone.value.kg, band: muscleBoneBand(muscle.value.kg / bone.value.kg) })
    : missingBlock<ValueWithBand>(unionMissing(muscle, bone), unionNeeds(muscle, bone));

  // Distribución adiposa (sobre Σ6) y muscular (sobre los perímetros corregidos)
  const adiposeDistribution = sum6.ok && sum6.value > 0
    ? ok({
        superior: ((p6.values.triceps_mm + p6.values.subscapular_mm) / sum6.value) * 100,
        central: ((p6.values.supraspinal_mm + p6.values.abdominal_mm) / sum6.value) * 100,
        inferior: ((p6.values.thigh_mm + p6.values.calf_mm) / sum6.value) * 100,
      })
    : missingBlock<{ superior: number; central: number; inferior: number }>(sum6.ok ? [] : sum6.missing);
  const muscleDistribution = correctedGirths.ok
    ? (() => {
        const { arm, thigh, calf } = correctedGirths.value;
        const total = arm + thigh + calf;
        return ok({ arm: (arm / total) * 100, thigh: (thigh / total) * 100, calf: (calf / total) * 100 });
      })()
    : missingBlock<{ arm: number; thigh: number; calf: number }>(correctedGirths.missing);

  // Somatotipo
  const pSoma = pick(s, [
    'triceps_mm',
    'subscapular_mm',
    'supraspinal_mm',
    'calf_mm',
    'height_cm',
    'weight_kg',
    'humerus_breadth_cm',
    'femur_breadth_cm',
    'arm_flexed_right_cm',
    'calf_right_cm',
  ]);
  const somatotype = pSoma.missing.length
    ? missingBlock<Somatotype>(pSoma.missing)
    : (() => {
        const v = pSoma.values;
        const endo = endomorphy(v.triceps_mm, v.subscapular_mm, v.supraspinal_mm, v.height_cm);
        const meso = mesomorphy({
          humerusCm: v.humerus_breadth_cm,
          femurCm: v.femur_breadth_cm,
          armFlexedCm: v.arm_flexed_right_cm,
          tricepsMm: v.triceps_mm,
          calfGirthCm: v.calf_right_cm,
          calfSkinfoldMm: v.calf_mm,
          heightCm: v.height_cm,
        });
        const ecto = ectomorphy(v.height_cm, v.weight_kg);
        const { x, y } = somatochartXY(endo, meso, ecto);
        const category = somatotypeCategory(endo, meso, ecto);
        return ok({ endo, meso, ecto, x, y, category, categoryLabel: somatotypeCategoryLabel(category) });
      })();

  // Phantom
  const phantom = phantomRows(
    {
      ...s,
      corrected_arm: correctedGirths.ok ? correctedGirths.value.arm : null,
      corrected_thigh: correctedGirths.ok ? correctedGirths.value.thigh : null,
      corrected_calf: correctedGirths.ok ? correctedGirths.value.calf : null,
      fat_mass_kg: fat.ok ? fat.value.fatKg : null,
      adipose_kg: adipose.ok ? adipose.value.kg : null,
      muscle_kg: muscle.ok ? muscle.value.kg : null,
      bone_kg: bone.ok ? bone.value.kg : null,
    },
    height ?? null
  );

  // Proporcionalidad
  const pCormic = pick(s, ['sitting_height_cm', 'height_cm']);
  const cormicIndex = pCormic.missing.length
    ? missingBlock<ValueWithBand>(pCormic.missing)
    : (() => {
        const value = pCormic.values.sitting_height_cm / pCormic.values.height_cm;
        return ok({ value, band: cormicBand(value) });
      })();
  const manouvrierIndex = pCormic.missing.length
    ? missingBlock<ValueWithBand>(pCormic.missing)
    : (() => {
        const sit = pCormic.values.sitting_height_cm;
        const value = ((pCormic.values.height_cm - sit) / sit) * 100;
        return ok({ value, band: manouvrierBand(value) });
      })();
  const pSpan = pick(s, ['arm_span_cm', 'height_cm']);
  const relativeSpan = pSpan.missing.length
    ? missingBlock<ValueWithBand>(pSpan.missing)
    : (() => {
        const value = pSpan.values.arm_span_cm / pSpan.values.height_cm;
        return ok({ value, band: relativeSpanBand(value) });
      })();

  // Salud
  const pWhr = pick(s, ['waist_cm', 'hip_cm']);
  const waistHipRatio = pWhr.missing.length
    ? missingBlock<ValueWithBand>(pWhr.missing)
    : (() => {
        const value = pWhr.values.waist_cm / pWhr.values.hip_cm;
        return ok({ value, band: waistHipBand(value, sex) });
      })();
  const pCon = pick(s, ['waist_cm', 'weight_kg', 'height_cm']);
  const conicityIndex = pCon.missing.length
    ? missingBlock<ValueWithBand>(pCon.missing)
    : (() => {
        const value =
          pCon.values.waist_cm / 100 / (0.109 * Math.sqrt(pCon.values.weight_kg / (pCon.values.height_cm / 100)));
        return ok({ value, band: conicityBand(value, sex) });
      })();
  const pWht = pick(s, ['waist_cm', 'height_cm']);
  const waistHeightRatio = pWht.missing.length
    ? missingBlock<ValueWithBand>(pWht.missing)
    : (() => {
        const value = pWht.values.waist_cm / pWht.values.height_cm;
        return ok({ value, band: waistHeightBand(value) });
      })();
  const fatDistributionIndex = p6.missing.length
    ? missingBlock<{ value: number; trunkPct: number; limbsPct: number }>(p6.missing)
    : (() => {
        const v = p6.values;
        const limbs = v.triceps_mm + v.thigh_mm + v.calf_mm;
        const trunk = v.subscapular_mm + v.supraspinal_mm + v.abdominal_mm;
        const total = limbs + trunk;
        return ok({ value: limbs / trunk, trunkPct: (trunk / total) * 100, limbsPct: (limbs / total) * 100 });
      })();

  const pArm = pick(s, ['arm_flexed_right_cm', 'arm_right_cm']);
  const armFlexedDiff: Block<number> = pArm.missing.length
    ? missingBlock(pArm.missing)
    : ok(pArm.values.arm_flexed_right_cm - pArm.values.arm_right_cm);

  warnings.push(...crossCheck(s));

  return {
    sum6,
    sum8,
    bmi,
    fat,
    fatAlternatives,
    adipose,
    muscle,
    bone,
    residual,
    adiposeMuscleIndex,
    muscleBoneIndex,
    adiposeDistribution,
    muscleDistribution,
    correctedGirths,
    somatotype,
    phantom,
    cormicIndex,
    manouvrierIndex,
    relativeSpan,
    waistHipRatio,
    conicityIndex,
    waistHeightRatio,
    fatDistributionIndex,
    armFlexedDiff,
    warnings,
  };
}

function unionMissing(...blocks: Block<unknown>[]): SiteId[] {
  const set = new Set<SiteId>();
  for (const b of blocks) if (!b.ok) b.missing.forEach((m) => set.add(m));
  return [...set];
}

function unionNeeds(...blocks: Block<unknown>[]): ('sex' | 'age')[] {
  const set = new Set<'sex' | 'age'>();
  for (const b of blocks) if (!b.ok) b.needs.forEach((n) => set.add(n));
  return [...set];
}
