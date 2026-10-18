// Comprueba el motor ISAK contra el informe de referencia y escenarios de sesión.
// Uso: npm run check:anthro   (Node ≥ 22.18 ejecuta los .ts con eliminación de tipos)
import assert from 'node:assert/strict';

import {
  aggregateReadings,
  checkReading,
  computeIsak,
  createSession,
  needsThird,
  sessionFinals,
  sessionReducer,
  siteStatus,
  temByGroup,
} from '../src/features/anthropometry/engine/index.ts';
import { ISAKMETRY_M28 } from '../src/features/anthropometry/engine/fixtures.ts';

let failures = 0;
let passes = 0;

function check(name, fn) {
  try {
    fn();
    passes += 1;
  } catch (error) {
    failures += 1;
    console.error(`✗ ${name}\n  ${error.message}`);
  }
}

/** Lee un valor del resultado por ruta («fat.pct», «phantom.triceps_mm»…). */
function valueAt(results, path) {
  const [head, ...rest] = path.split('.');
  if (head === 'phantom') return results.phantom.find((r) => r.id === rest[0])?.z ?? null;
  let block = results[head];
  if (block && typeof block === 'object' && 'ok' in block) {
    if (!block.ok) return null;
    block = block.value;
  }
  let current = block;
  for (const key of rest) current = current?.[key];
  return typeof current === 'number' ? current : null;
}

// 1. Informe de referencia (PDF ISAKmetry)
const results = computeIsak(ISAKMETRY_M28.input);
for (const [path, expected, tolerance = 0.01] of ISAKMETRY_M28.expected) {
  check(`PDF ${path}`, () => {
    const actual = valueAt(results, path);
    assert.ok(actual != null, `sin valor (bloque no calculado)`);
    assert.ok(Math.abs(actual - expected) <= tolerance + 1e-9, `esperado ${expected} ± ${tolerance}, obtenido ${actual.toFixed(4)}`);
  });
}
check('Somatotipo: mesomorfo balanceado', () => assert.equal(results.somatotype.value.category, 'mesomorfo_balanceado'));
check('Índice córmico: macrocórmico', () => assert.equal(results.cormicIndex.value.band.id, 'macrocormico'));
check('Manouvrier: miembros medianos', () => assert.equal(results.manouvrierIndex.value.band.id, 'mesoesquelico'));
check('Músculo/óseo: medio', () => assert.equal(results.muscleBoneIndex.value.band.id, 'medio'));
check('ICT: riesgo bajo', () => assert.equal(results.waistHeightRatio.value.band.id, 'bajo'));
check('IMC: normopeso', () => assert.equal(results.bmi.value.band.id, 'normopeso'));
check('Somatocarta X/Y', () => {
  assert.ok(Math.abs(results.somatotype.value.x - 0.5) < 0.01);
  assert.ok(Math.abs(results.somatotype.value.y - 4.08) < 0.02);
});

// 2. Ecuaciones alternativas (calculadas a mano)
const alt = Object.fromEntries(results.fatAlternatives.map((a) => [a.equation, a.pct]));
check('Faulkner 11,14 %', () => assert.ok(Math.abs(alt.faulkner - 11.14) < 0.01, String(alt.faulkner)));
check('Carter 8,47 %', () => assert.ok(Math.abs(alt.carter - 8.466) < 0.01, String(alt.carter)));
check('Slaughter solo < 18 años', () => assert.equal(alt.slaughter, undefined));
const teen = computeIsak({ ...ISAKMETRY_M28.input, ageYears: 15 });
check('Slaughter 14,23 % a los 15 años', () => {
  assert.equal(teen.fat.value.equation, 'slaughter');
  assert.ok(Math.abs(teen.fat.value.pct - 14.23) < 0.01, String(teen.fat.value.pct));
});

// 3. Datos que faltan: solo se pierden los bloques dependientes
const noSpan = computeIsak({ ...ISAKMETRY_M28.input, sites: { ...ISAKMETRY_M28.input.sites, arm_span_cm: null } });
check('Sin envergadura: solo falla la envergadura relativa', () => {
  assert.equal(noSpan.relativeSpan.ok, false);
  assert.deepEqual(noSpan.relativeSpan.missing, ['arm_span_cm']);
  assert.equal(noSpan.fat.ok, true);
  assert.equal(noSpan.somatotype.ok, true);
});
const noSex = computeIsak({ ...ISAKMETRY_M28.input, sex: null });
check('Sin sexo: % grasa y músculo piden el sexo', () => {
  assert.equal(noSex.fat.ok, false);
  assert.deepEqual(noSex.fat.needs, ['sex']);
  assert.equal(noSex.muscle.ok, false);
  assert.equal(noSex.adipose.ok, true);
  assert.equal(noSex.somatotype.ok, true);
});

// 4. Regla de lecturas
check('Media de 8,1 y 8,2 → 8,2', () => assert.equal(aggregateReadings([8.1, 8.2], 1), 8.2));
check('Mediana de 11; 12; 11,4 → 11,4', () => assert.equal(aggregateReadings([11, 12, 11.4], 1), 11.4));
check('Mediana con valor repetido → el repetido', () => assert.equal(aggregateReadings([11, 12, 11], 1), 11));
check('Tríceps 11/12 (8,7 %) pide 3.ª', () => assert.equal(needsThird('triceps_mm', 11, 12), true));
check('Tríceps 11/11,5 (4,4 %) no pide 3.ª', () => assert.equal(needsThird('triceps_mm', 11, 11.5), false));
check('Cintura 71/71,9 (1,3 %) pide 3.ª', () => assert.equal(needsThird('waist_cm', 71, 71.9), true));
check('Cintura 71/71,5 (0,7 %) no pide 3.ª', () => assert.equal(needsThird('waist_cm', 71, 71.5), false));

// 5. Sesión por rondas
const sites = ['triceps_mm', 'subscapular_mm', 'waist_cm'];
let s = createSession(
  { id: 't', clientId: 'c', trainerId: 'u', measuredOn: '2026-10-17', mode: 'guided', order: 'rounds', sites, fatEquation: null },
  0
);
const rec = (value) => (s = sessionReducer(s, { type: 'record', value, now: 1 }));
check('Ronda 1 → pausa', () => {
  rec(11); rec(6); rec(71);
  assert.equal(s.phase, 'break');
});
check('Ronda 2 con tríceps fuera de tolerancia → pausa y 3.ª solo del tríceps', () => {
  s = sessionReducer(s, { type: 'startPass', now: 2 });
  assert.equal(s.pass, 2);
  rec(12); rec(6); rec(71.2);
  assert.equal(s.phase, 'break');
  s = sessionReducer(s, { type: 'startPass', now: 3 });
  assert.equal(s.pass, 3);
  assert.deepEqual(s.queue, ['triceps_mm']);
  rec(11.4);
  assert.equal(s.phase, 'review');
  assert.equal(sessionFinals(s).triceps_mm, 11.4);
  assert.equal(sessionFinals(s).waist_cm, 71.1);
  assert.equal(siteStatus(s, 'triceps_mm'), 'ok');
});
check('ETM por grupo', () => {
  const tem = temByGroup(s.readings);
  const folds = tem.find((t) => t.group === 'pliegues');
  // tríceps 11/12 y subescapular 6/6: 100·√(((1/11,5)² + 0) / (2·2)) = 4,35 %
  assert.ok(folds && Math.abs(folds.relativePct - 4.35) < 0.01, String(folds?.relativePct));
  assert.equal(folds.tone, 'good');
});

// Rondas sin discrepancias → revisión directa
let s2 = createSession(
  { id: 't2', clientId: 'c', trainerId: 'u', measuredOn: '2026-10-17', mode: 'guided', order: 'rounds', sites, fatEquation: null },
  0
);
const rec2 = (value) => (s2 = sessionReducer(s2, { type: 'record', value, now: 1 }));
check('Dos rondas iguales → revisión sin 3.ª', () => {
  rec2(11); rec2(6); rec2(71);
  s2 = sessionReducer(s2, { type: 'startPass', now: 2 });
  rec2(11); rec2(6); rec2(71);
  assert.equal(s2.phase, 'review');
});

// Seguido: la 3.ª se pide al momento
let s3 = createSession(
  { id: 't3', clientId: 'c', trainerId: 'u', measuredOn: '2026-10-17', mode: 'guided', order: 'consecutive', sites, fatEquation: null },
  0
);
const rec3 = (value) => (s3 = sessionReducer(s3, { type: 'record', value, now: 1 }));
check('Seguido: 11 y 12 → se queda en el tríceps para la 3.ª', () => {
  rec3(11); rec3(12);
  assert.equal(s3.queue[s3.index], 'triceps_mm');
  rec3(11.4);
  assert.equal(s3.queue[s3.index], 'subscapular_mm');
});
check('Atrás deshace la última lectura', () => {
  rec3(6);
  s3 = sessionReducer(s3, { type: 'back', now: 2 });
  assert.equal(s3.readings.subscapular_mm.length, 0);
  assert.equal(s3.queue[s3.index], 'subscapular_mm');
});
check('Saltar marca el punto como saltado', () => {
  s3 = sessionReducer(s3, { type: 'skip', now: 3 });
  assert.equal(siteStatus(s3, 'subscapular_mm'), 'skipped');
});

// 6. Plausibilidad
check('Talla 1,69 → bloquea y sugiere 169', () => {
  const r = checkReading('height_cm', 1.69);
  assert.equal(r.level, 'block');
  assert.equal(r.suggestion, 169);
});
check('Diámetro 62 → sugiere 6,2', () => assert.equal(checkReading('humerus_breadth_cm', 62).suggestion, 6.2));
check('Pliegue muy distinto del anterior → confirmar', () => assert.equal(checkReading('triceps_mm', 20, { previous: 11 }).level, 'confirm'));
check('Pliegue normal → ok', () => assert.equal(checkReading('triceps_mm', 11.2, { previous: 11 }).level, 'ok'));

// 7. Jackson-Pollock (cálculo a mano: Σ3 = 45 mm, 30 años, hombre → D 1,06770 → 13,6 %)
check('Jackson-Pollock 3 pliegues, hombre', () => {
  const r = computeIsak({
    sex: 'hombre',
    ageYears: 30,
    fatEquation: 'jp3',
    sites: { weight_kg: 80, chest_mm: 10, abdominal_mm: 20, thigh_mm: 15 },
  });
  assert.ok(r.fat.ok);
  assert.ok(Math.abs(r.fat.value.density - 1.0676965) < 1e-6);
  assert.ok(Math.abs(r.fat.value.pct - 13.61) < 0.05);
});
check('Jackson-Pollock 3 pliegues, mujer usa tríceps, supraespinal y muslo', () => {
  const r = computeIsak({
    sex: 'mujer',
    ageYears: 30,
    fatEquation: 'jp3',
    sites: { weight_kg: 60, triceps_mm: 15, supraspinal_mm: 12, thigh_mm: 25 },
  });
  assert.ok(r.fat.ok);
  // D = 1,0994921 − 0,0009929·52 + 0,0000023·2704 − 0,0001392·30
  assert.ok(Math.abs(r.fat.value.density - 1.0499045) < 1e-6);
});
check('Jackson-Pollock 7 pliegues', () => {
  const r = computeIsak({
    sex: 'hombre',
    ageYears: 30,
    fatEquation: 'jp7',
    sites: { weight_kg: 80, chest_mm: 8, midaxillary_mm: 9, triceps_mm: 10, subscapular_mm: 12, abdominal_mm: 18, supraspinal_mm: 10, thigh_mm: 14 },
  });
  assert.ok(r.fat.ok);
  // Σ7 = 81 → D = 1,112 − 0,00043499·81 + 0,00000055·6561 − 0,00028826·30
  assert.ok(Math.abs(r.fat.value.density - 1.0717266) < 1e-6);
});
check('Jackson-Pollock sin un pliegue → indica cuál falta', () => {
  const r = computeIsak({ sex: 'hombre', ageYears: 30, fatEquation: 'jp3', sites: { chest_mm: 10, abdominal_mm: 20 } });
  assert.ok(!r.fat.ok);
  assert.deepEqual(r.fat.missing, ['thigh_mm']);
});

console.log(`\n${passes} comprobaciones correctas, ${failures} fallidas.`);
if (failures) process.exit(1);
