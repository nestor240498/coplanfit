import { MuscleGroup } from './types';

export type MovementPattern =
  | 'press_horizontal'   // Press banca, pushups
  | 'cable_fly'          // Cruces de poleas, aperturas
  | 'press_vertical'     // Press militar, press hombros
  | 'pull_vertical'      // Dominadas, jalones
  | 'pull_horizontal'    // Remos, remo polea
  | 'squat'              // Sentadilla, prensa
  | 'hinge'              // Peso muerto, hip thrust
  | 'arm_flexion'        // Curl bíceps
  | 'arm_extension'      // Tríceps polea, fondos
  | 'lateral_raise'      // Elevaciones laterales
  | 'core';              // Crunches, planchas

export function detectMovementPattern(name: string, muscleGroup: MuscleGroup): MovementPattern {
  const n = name.toLowerCase();

  if (n.includes('cruce') || n.includes('apertura') || n.includes('fly') || n.includes('pec deck')) {
    return 'cable_fly';
  }
  if (n.includes('lateral') || n.includes('pájaro') || n.includes('face pull') || n.includes('vuelo')) {
    return 'lateral_raise';
  }
  if (n.includes('bíceps') || n.includes('curl') || n.includes('martillo') || n.includes('predicador')) {
    return 'arm_flexion';
  }
  if (n.includes('tríceps') || n.includes('extensión') || n.includes('fondos') || n.includes('francés') || n.includes('copa')) {
    return 'arm_extension';
  }
  if (n.includes('sentadilla') || n.includes('prensa') || n.includes('zancada') || n.includes('búlgara') || n.includes('cuádriceps') || n.includes('hack') || n.includes('squat')) {
    return 'squat';
  }
  if (n.includes('peso muerto') || n.includes('hip thrust') || n.includes('femoral') || n.includes('glúteo') || n.includes('rumano') || n.includes('deadlift')) {
    return 'hinge';
  }
  if (n.includes('dominada') || n.includes('jalón') || n.includes('pulldown') || n.includes('polea alta')) {
    return 'pull_vertical';
  }
  if (n.includes('remo') || n.includes('row') || n.includes('polea baja') || n.includes('gironda')) {
    return 'pull_horizontal';
  }
  if (n.includes('militar') || n.includes('hombro') || n.includes('press hombros') || n.includes('arnold')) {
    return 'press_vertical';
  }
  if (n.includes('banca') || n.includes('pecho') || n.includes('flexión') || n.includes('push-up')) {
    return 'press_horizontal';
  }

  switch (muscleGroup) {
    case 'pecho':
      return 'press_horizontal';
    case 'espalda':
      return 'pull_horizontal';
    case 'cuadriceps':
      return 'squat';
    case 'isquiotibiales':
    case 'gluteos':
      return 'hinge';
    case 'hombros':
      return 'press_vertical';
    case 'biceps':
      return 'arm_flexion';
    case 'triceps':
      return 'arm_extension';
    default:
      return 'squat';
  }
}

export function generateKinematicLottieAnimation(
  exerciseName: string,
  muscleGroup: MuscleGroup,
  explicitPattern?: string
) {
  const pattern = (explicitPattern as MovementPattern) || detectMovementPattern(exerciseName, muscleGroup);

  const NAVY = [0.106, 0.165, 0.29, 1]; // #1B2A4A
  const LIME = [0.545, 0.773, 0.247, 1]; // #8BC53F

  if (pattern === 'cable_fly') {
    return {
      v: '5.5.7',
      fr: 30,
      ip: 0,
      op: 60,
      w: 300,
      h: 300,
      nm: `AI Fly: ${exerciseName}`,
      layers: [
        {
          ddd: 0,
          ind: 1,
          ty: 4,
          nm: 'Left Handle & Cable',
          ks: {
            o: { a: 0, k: 100 },
            r: {
              a: 1,
              k: [
                { i: { x: [0.5], y: [1] }, o: { x: [0.3], y: [0] }, t: 0, s: [35] },
                { i: { x: [0.5], y: [1] }, o: { x: [0.3], y: [0] }, t: 30, s: [-10] },
                { t: 60, s: [35] },
              ],
            },
            p: {
              a: 1,
              k: [
                { i: { x: 0.5, y: 1 }, o: { x: 0.3, y: 0 }, t: 0, s: [75, 140, 0] },
                { i: { x: 0.5, y: 1 }, o: { x: 0.3, y: 0 }, t: 30, s: [135, 150, 0] },
                { t: 60, s: [75, 140, 0] },
              ],
            },
            a: { a: 0, k: [0, 0, 0] },
            s: { a: 0, k: [100, 100, 100] },
          },
          shapes: [
            {
              ty: 'gr',
              it: [
                { ty: 'rc', d: 1, s: { a: 0, k: [16, 40] }, p: { a: 0, k: [0, 0] }, r: { a: 0, k: 6 }, nm: 'Handle L' },
                { ty: 'fl', c: { a: 0, k: LIME }, o: { a: 0, k: 100 }, nm: 'Fill L' },
                { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
              ],
              nm: 'Left Grip',
            },
          ],
          ip: 0,
          op: 60,
          st: 0,
        },
        {
          ddd: 0,
          ind: 2,
          ty: 4,
          nm: 'Right Handle & Cable',
          ks: {
            o: { a: 0, k: 100 },
            r: {
              a: 1,
              k: [
                { i: { x: [0.5], y: [1] }, o: { x: [0.3], y: [0] }, t: 0, s: [-35] },
                { i: { x: [0.5], y: [1] }, o: { x: [0.3], y: [0] }, t: 30, s: [10] },
                { t: 60, s: [-35] },
              ],
            },
            p: {
              a: 1,
              k: [
                { i: { x: 0.5, y: 1 }, o: { x: 0.3, y: 0 }, t: 0, s: [225, 140, 0] },
                { i: { x: 0.5, y: 1 }, o: { x: 0.3, y: 0 }, t: 30, s: [165, 150, 0] },
                { t: 60, s: [225, 140, 0] },
              ],
            },
            a: { a: 0, k: [0, 0, 0] },
            s: { a: 0, k: [100, 100, 100] },
          },
          shapes: [
            {
              ty: 'gr',
              it: [
                { ty: 'rc', d: 1, s: { a: 0, k: [16, 40] }, p: { a: 0, k: [0, 0] }, r: { a: 0, k: 6 }, nm: 'Handle R' },
                { ty: 'fl', c: { a: 0, k: LIME }, o: { a: 0, k: 100 }, nm: 'Fill R' },
                { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
              ],
              nm: 'Right Grip',
            },
          ],
          ip: 0,
          op: 60,
          st: 0,
        },
        {
          ddd: 0,
          ind: 3,
          ty: 4,
          nm: 'Chest Center',
          ks: {
            o: { a: 0, k: 100 },
            r: { a: 0, k: 0 },
            p: { a: 0, k: [150, 150, 0] },
            a: { a: 0, k: [0, 0, 0] },
            s: {
              a: 1,
              k: [
                { i: { x: [0.5, 0.5, 0.5], y: [1, 1, 1] }, o: { x: [0.3, 0.3, 0.3], y: [0, 0, 0] }, t: 0, s: [90, 90, 100] },
                { i: { x: [0.5, 0.5, 0.5], y: [1, 1, 1] }, o: { x: [0.3, 0.3, 0.3], y: [0, 0, 0] }, t: 30, s: [115, 115, 100] },
                { t: 60, s: [90, 90, 100] },
              ],
            },
          },
          shapes: [
            {
              ty: 'gr',
              it: [
                { ty: 'el', d: 1, s: { a: 0, k: [42, 42] }, p: { a: 0, k: [0, 0] }, nm: 'Torso Core' },
                { ty: 'fl', c: { a: 0, k: NAVY }, o: { a: 0, k: 100 }, nm: 'Fill Torso' },
                { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
              ],
              nm: 'Chest Core Group',
            },
          ],
          ip: 0,
          op: 60,
          st: 0,
        },
      ],
    };
  }

  if (pattern === 'lateral_raise') {
    return {
      v: '5.5.7',
      fr: 30,
      ip: 0,
      op: 60,
      w: 300,
      h: 300,
      nm: `AI Lateral: ${exerciseName}`,
      layers: [
        {
          ddd: 0,
          ind: 1,
          ty: 4,
          nm: 'Dumbbell Left',
          ks: {
            o: { a: 0, k: 100 },
            r: {
              a: 1,
              k: [
                { i: { x: [0.4], y: [1] }, o: { x: [0.2], y: [0] }, t: 0, s: [0] },
                { i: { x: [0.4], y: [1] }, o: { x: [0.2], y: [0] }, t: 28, s: [-30] },
                { t: 60, s: [0] },
              ],
            },
            p: {
              a: 1,
              k: [
                { i: { x: 0.4, y: 1 }, o: { x: 0.2, y: 0 }, t: 0, s: [120, 200, 0] },
                { i: { x: 0.4, y: 1 }, o: { x: 0.2, y: 0 }, t: 28, s: [60, 120, 0] },
                { t: 60, s: [120, 200, 0] },
              ],
            },
            a: { a: 0, k: [0, 0, 0] },
            s: { a: 0, k: [100, 100, 100] },
          },
          shapes: [
            {
              ty: 'gr',
              it: [
                { ty: 'rc', d: 1, s: { a: 0, k: [22, 50] }, p: { a: 0, k: [0, 0] }, r: { a: 0, k: 6 }, nm: 'Db L' },
                { ty: 'fl', c: { a: 0, k: LIME }, o: { a: 0, k: 100 }, nm: 'Fill Db L' },
                { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
              ],
              nm: 'Left Weight',
            },
          ],
          ip: 0,
          op: 60,
          st: 0,
        },
        {
          ddd: 0,
          ind: 2,
          ty: 4,
          nm: 'Dumbbell Right',
          ks: {
            o: { a: 0, k: 100 },
            r: {
              a: 1,
              k: [
                { i: { x: [0.4], y: [1] }, o: { x: [0.2], y: [0] }, t: 0, s: [0] },
                { i: { x: [0.4], y: [1] }, o: { x: [0.2], y: [0] }, t: 28, s: [30] },
                { t: 60, s: [0] },
              ],
            },
            p: {
              a: 1,
              k: [
                { i: { x: 0.4, y: 1 }, o: { x: 0.2, y: 0 }, t: 0, s: [180, 200, 0] },
                { i: { x: 0.4, y: 1 }, o: { x: 0.2, y: 0 }, t: 28, s: [240, 120, 0] },
                { t: 60, s: [180, 200, 0] },
              ],
            },
            a: { a: 0, k: [0, 0, 0] },
            s: { a: 0, k: [100, 100, 100] },
          },
          shapes: [
            {
              ty: 'gr',
              it: [
                { ty: 'rc', d: 1, s: { a: 0, k: [22, 50] }, p: { a: 0, k: [0, 0] }, r: { a: 0, k: 6 }, nm: 'Db R' },
                { ty: 'fl', c: { a: 0, k: LIME }, o: { a: 0, k: 100 }, nm: 'Fill Db R' },
                { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
              ],
              nm: 'Right Weight',
            },
          ],
          ip: 0,
          op: 60,
          st: 0,
        },
      ],
    };
  }

  if (pattern === 'squat' || pattern === 'hinge') {
    return {
      v: '5.5.7',
      fr: 30,
      ip: 0,
      op: 60,
      w: 300,
      h: 300,
      nm: `AI Squat: ${exerciseName}`,
      layers: [
        {
          ddd: 0,
          ind: 1,
          ty: 4,
          nm: 'Squat Barbell',
          ks: {
            o: { a: 0, k: 100 },
            r: { a: 0, k: 0 },
            p: {
              a: 1,
              k: [
                { i: { x: 0.5, y: 1 }, o: { x: 0.25, y: 0 }, t: 0, s: [150, 90, 0] },
                { i: { x: 0.5, y: 1 }, o: { x: 0.25, y: 0 }, t: 30, s: [150, 185, 0] },
                { t: 60, s: [150, 90, 0] },
              ],
            },
            a: { a: 0, k: [0, 0, 0] },
            s: {
              a: 1,
              k: [
                { i: { x: [0.5, 0.5, 0.5], y: [1, 1, 1] }, o: { x: [0.25, 0.25, 0.25], y: [0, 0, 0] }, t: 0, s: [100, 100, 100] },
                { i: { x: [0.5, 0.5, 0.5], y: [1, 1, 1] }, o: { x: [0.25, 0.25, 0.25], y: [0, 0, 0] }, t: 30, s: [115, 80, 100] },
                { t: 60, s: [100, 100, 100] },
              ],
            },
          },
          shapes: [
            {
              ty: 'gr',
              it: [
                { ty: 'rc', d: 1, s: { a: 0, k: [140, 12] }, p: { a: 0, k: [0, 0] }, r: { a: 0, k: 6 }, nm: 'Bar' },
                { ty: 'fl', c: { a: 0, k: NAVY }, o: { a: 0, k: 100 }, nm: 'Bar Fill' },
                { ty: 'rc', d: 1, s: { a: 0, k: [22, 60] }, p: { a: 0, k: [-65, 0] }, r: { a: 0, k: 8 }, nm: 'Plate L' },
                { ty: 'rc', d: 1, s: { a: 0, k: [22, 60] }, p: { a: 0, k: [65, 0] }, r: { a: 0, k: 8 }, nm: 'Plate R' },
                { ty: 'fl', c: { a: 0, k: LIME }, o: { a: 0, k: 100 }, nm: 'Plate Fill' },
                { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
              ],
              nm: 'Barbell Structure',
            },
          ],
          ip: 0,
          op: 60,
          st: 0,
        },
      ],
    };
  }

  if (pattern === 'arm_flexion') {
    return {
      v: '5.5.7',
      fr: 30,
      ip: 0,
      op: 60,
      w: 300,
      h: 300,
      nm: `AI Curl: ${exerciseName}`,
      layers: [
        {
          ddd: 0,
          ind: 1,
          ty: 4,
          nm: 'Curl Weight Rotation',
          ks: {
            o: { a: 0, k: 100 },
            r: {
              a: 1,
              k: [
                { i: { x: [0.45], y: [1] }, o: { x: [0.25], y: [0] }, t: 0, s: [-55] },
                { i: { x: [0.45], y: [1] }, o: { x: [0.25], y: [0] }, t: 28, s: [55] },
                { t: 60, s: [-55] },
              ],
            },
            p: {
              a: 1,
              k: [
                { i: { x: 0.45, y: 1 }, o: { x: 0.25, y: 0 }, t: 0, s: [150, 195, 0] },
                { i: { x: 0.45, y: 1 }, o: { x: 0.25, y: 0 }, t: 28, s: [150, 105, 0] },
                { t: 60, s: [150, 195, 0] },
              ],
            },
            a: { a: 0, k: [0, 0, 0] },
            s: { a: 0, k: [100, 100, 100] },
          },
          shapes: [
            {
              ty: 'gr',
              it: [
                { ty: 'rc', d: 1, s: { a: 0, k: [120, 10] }, p: { a: 0, k: [0, 0] }, r: { a: 0, k: 5 }, nm: 'Bar' },
                { ty: 'fl', c: { a: 0, k: NAVY }, o: { a: 0, k: 100 }, nm: 'Bar Fill' },
                { ty: 'rc', d: 1, s: { a: 0, k: [22, 50] }, p: { a: 0, k: [-55, 0] }, r: { a: 0, k: 8 }, nm: 'Plate L' },
                { ty: 'rc', d: 1, s: { a: 0, k: [22, 50] }, p: { a: 0, k: [55, 0] }, r: { a: 0, k: 8 }, nm: 'Plate R' },
                { ty: 'fl', c: { a: 0, k: LIME }, o: { a: 0, k: 100 }, nm: 'Plates Fill' },
                { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
              ],
              nm: 'Biceps Weight',
            },
          ],
          ip: 0,
          op: 60,
          st: 0,
        },
      ],
    };
  }

  // DEFAULT / BENCH PRESS
  return {
    v: '5.5.7',
    fr: 30,
    ip: 0,
    op: 60,
    w: 300,
    h: 300,
    nm: `AI Kinematic: ${exerciseName}`,
    layers: [
      {
        ddd: 0,
        ind: 1,
        ty: 4,
        nm: 'Bench Press Barbell',
        ks: {
          o: { a: 0, k: 100 },
          r: { a: 0, k: 0 },
          p: {
            a: 1,
            k: [
              { i: { x: 0.35, y: 1 }, o: { x: 0.15, y: 0 }, t: 0, s: [150, 195, 0] },
              { i: { x: 0.35, y: 1 }, o: { x: 0.15, y: 0 }, t: 26, s: [150, 80, 0] },
              { t: 60, s: [150, 195, 0] },
            ],
          },
          a: { a: 0, k: [0, 0, 0] },
          s: { a: 0, k: [100, 100, 100] },
        },
        shapes: [
          {
            ty: 'gr',
            it: [
              { ty: 'rc', d: 1, s: { a: 0, k: [140, 12] }, p: { a: 0, k: [0, 0] }, r: { a: 0, k: 6 }, nm: 'Bar' },
              { ty: 'fl', c: { a: 0, k: NAVY }, o: { a: 0, k: 100 }, nm: 'Fill Bar' },
              { ty: 'rc', d: 1, s: { a: 0, k: [22, 64] }, p: { a: 0, k: [-65, 0] }, r: { a: 0, k: 8 }, nm: 'Disk L' },
              { ty: 'rc', d: 1, s: { a: 0, k: [22, 64] }, p: { a: 0, k: [65, 0] }, r: { a: 0, k: 8 }, nm: 'Disk R' },
              { ty: 'fl', c: { a: 0, k: LIME }, o: { a: 0, k: 100 }, nm: 'Fill Disks' },
              { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
            ],
            nm: 'Barbell Structure',
          },
        ],
        ip: 0,
        op: 60,
        st: 0,
      },
    ],
  };
}
