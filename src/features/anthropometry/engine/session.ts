import { aggregateReadings } from './numbers.ts';
import { needsThird } from './quality.ts';
import { SITE_BY_ID, SITE_IDS } from './sites.ts';
import type { FatEquation, MeasurementReadings, SiteId, SiteValues } from './types.ts';

/**
 * Sesión de medición ISAK como máquina de estados pura (reductor). La hora y el id llegan en las
 * acciones: el reductor no lee el reloj ni genera aleatorios (React Compiler).
 *
 * - Modo «guided» por rondas: ronda 1 por todos los puntos, ronda 2 por todos, y 3.ª lectura solo de
 *   los que superan la tolerancia.
 * - Modo «guided» seguido: cada punto se completa antes de pasar al siguiente (2 lecturas y la 3.ª al momento).
 * - Modo «transcribe»: una lectura por punto (copiar desde papel o un informe).
 */

export type SessionMode = 'guided' | 'transcribe';
export type SessionOrder = 'rounds' | 'consecutive';
/** Qué se está midiendo: perfil ISAK restringido o pliegues de Jackson-Pollock (3 o 7). */
export type SessionProfile = 'isak' | 'skinfolds';
export type SessionPhase = 'measure' | 'break' | 'review';

/** Cómo se avanza en la cola actual: una lectura por visita, o completar el punto antes de pasar. */
type QueueMode = 'single' | 'complete';

export type IsakSession = {
  v: 1;
  id: string;
  clientId: string;
  trainerId: string;
  createdAt: number;
  updatedAt: number;
  /** Fecha de la medición (YYYY-MM-DD). */
  measuredOn: string;
  mode: SessionMode;
  order: SessionOrder;
  /** Borradores anteriores a Jackson-Pollock no lo traen: son ISAK. */
  profile?: SessionProfile;
  fatEquation: FatEquation | null;
  ethnicity: number;
  /** Anunciar en voz alta el punto y la lectura. */
  voice: boolean;
  source?: 'isakmetry_pdf';
  /** Resultados que trae el informe importado (para compararlos con los calculados). */
  reported?: Record<string, number | null>;
  /** Puntos incluidos, en orden ISAK. */
  sites: SiteId[];
  readings: Partial<Record<SiteId, number[]>>;
  skipped: SiteId[];
  phase: SessionPhase;
  pass: 1 | 2 | 3;
  queue: SiteId[];
  queueMode: QueueMode;
  index: number;
  /** Pila para «Atrás» dentro de la cola actual. */
  history: { site: SiteId; kind: 'record' | 'skip' }[];
};

export type SessionConfig = {
  id: string;
  clientId: string;
  trainerId: string;
  measuredOn: string;
  mode: SessionMode;
  order: SessionOrder;
  profile?: SessionProfile;
  sites: SiteId[];
  fatEquation: FatEquation | null;
  ethnicity?: number;
  voice?: boolean;
  source?: 'isakmetry_pdf';
  reported?: Record<string, number | null>;
  /** Lecturas iniciales (p. ej. importadas de un PDF): la sesión empieza en «Revisión». */
  initialReadings?: Partial<Record<SiteId, number[]>>;
};

export type SessionAction = { now: number } & (
  | { type: 'record'; value: number }
  | { type: 'skip' }
  | { type: 'back' }
  | { type: 'startPass' }
  | { type: 'finishEarly' }
  | { type: 'editReadings'; siteId: SiteId; readings: number[] }
  | { type: 'requestThird'; siteIds: SiteId[] }
  | { type: 'retake'; siteIds: SiteId[] }
  | { type: 'setMeasuredOn'; measuredOn: string }
  | { type: 'setFatEquation'; fatEquation: FatEquation | null }
  | { type: 'setVoice'; voice: boolean }
);

function ordered(sites: SiteId[]): SiteId[] {
  const set = new Set(sites);
  return SITE_IDS.filter((id) => set.has(id));
}

export function createSession(config: SessionConfig, now: number): IsakSession {
  const sites = ordered(config.sites);
  const base: IsakSession = {
    v: 1,
    id: config.id,
    clientId: config.clientId,
    trainerId: config.trainerId,
    createdAt: now,
    updatedAt: now,
    measuredOn: config.measuredOn,
    mode: config.mode,
    order: config.order,
    profile: config.profile ?? 'isak',
    fatEquation: config.fatEquation,
    ethnicity: config.ethnicity ?? 0,
    voice: config.voice ?? false,
    source: config.source,
    reported: config.reported,
    sites,
    readings: {},
    skipped: [],
    phase: 'measure',
    pass: 1,
    queue: sites,
    queueMode: config.mode === 'guided' && config.order === 'consecutive' ? 'complete' : 'single',
    index: 0,
    history: [],
  };
  if (config.initialReadings) {
    const readings: Partial<Record<SiteId, number[]>> = {};
    for (const id of sites) {
      const values = config.initialReadings[id];
      if (values && values.length) readings[id] = values.slice(0, 3);
    }
    return { ...base, readings, phase: 'review', queue: [], index: 0 };
  }
  return base;
}

/** Lecturas que necesita un punto para darse por resuelto. */
function isResolved(session: IsakSession, siteId: SiteId): boolean {
  const r = session.readings[siteId] ?? [];
  if (session.mode === 'transcribe') return r.length >= 1;
  if (r.length >= 3) return true;
  if (r.length === 2) return !needsThird(siteId, r[0], r[1]);
  return false;
}

export type SiteStatus = 'pending' | 'skipped' | 'partial' | 'needsThird' | 'ok';

export function siteStatus(session: IsakSession, siteId: SiteId): SiteStatus {
  const r = session.readings[siteId] ?? [];
  if (r.length === 0) return session.skipped.includes(siteId) ? 'skipped' : 'pending';
  if (isResolved(session, siteId)) return 'ok';
  if (r.length === 2) return 'needsThird';
  return 'partial';
}

/** Puntos con 2 lecturas fuera de tolerancia (sin 3.ª). */
export function sitesNeedingThird(session: IsakSession): SiteId[] {
  return session.sites.filter((id) => siteStatus(session, id) === 'needsThird');
}

/** Puntos sin resolver (pendientes, con una sola lectura o pendientes de 3.ª), sin contar los saltados. */
export function unresolvedSites(session: IsakSession): SiteId[] {
  return session.sites.filter((id) => {
    const st = siteStatus(session, id);
    return st === 'pending' || st === 'partial' || st === 'needsThird';
  });
}

/** Valores finales por punto (media de 2 o mediana de 3). */
export function sessionFinals(session: IsakSession): SiteValues {
  const finals: SiteValues = {};
  for (const id of session.sites) {
    const r = session.readings[id];
    if (r && r.length) finals[id] = aggregateReadings(r, SITE_BY_ID[id].decimals);
  }
  return finals;
}

export function currentSite(session: IsakSession): SiteId | null {
  if (session.phase !== 'measure') return null;
  return session.queue[session.index] ?? null;
}

/** Número de lectura que toca anotar ahora (1, 2 o 3). */
export function currentReadingNumber(session: IsakSession): number {
  const site = currentSite(session);
  if (!site) return 0;
  return (session.readings[site]?.length ?? 0) + 1;
}

/** Puntos con alguna lectura (para «14/21»). */
export function measuredCount(session: IsakSession): number {
  return session.sites.filter((id) => (session.readings[id]?.length ?? 0) > 0).length;
}

/** Lecturas listas para guardar en `measurements.readings`. */
export function sessionReadingsJson(session: IsakSession): MeasurementReadings {
  const sites: Partial<Record<SiteId, number[]>> = {};
  for (const id of session.sites) {
    const r = session.readings[id];
    if (r && r.length) sites[id] = [...r];
  }
  return {
    v: 1,
    rule: 'median',
    mode: session.mode,
    order: session.order,
    ...(session.source ? { source: session.source } : {}),
    sites,
    skipped: session.skipped.filter((id) => !(session.readings[id]?.length)),
  };
}

/** Avanza al siguiente punto de la cola o cierra la ronda. */
function advance(session: IsakSession): IsakSession {
  const nextIndex = session.index + 1;
  if (nextIndex < session.queue.length) return { ...session, index: nextIndex };
  return endOfQueue(session);
}

function endOfQueue(session: IsakSession): IsakSession {
  const done: IsakSession = { ...session, index: session.queue.length, history: [] };
  // Rondas: tras la 1.ª, pausa para empezar la 2.ª; tras la 2.ª, pausa si hay que repetir algún punto
  if (session.mode === 'guided' && session.queueMode === 'single' && session.order === 'rounds') {
    if (session.pass === 1) {
      const next = secondPassQueue(session);
      if (next.length) return { ...done, phase: 'break' };
    }
    if (session.pass <= 2 && sitesNeedingThird(session).length) return { ...done, phase: 'break' };
  }
  return { ...done, phase: 'review', queue: [], index: 0 };
}

function secondPassQueue(session: IsakSession): SiteId[] {
  return session.sites.filter((id) => (session.readings[id]?.length ?? 0) === 1);
}

export function sessionReducer(session: IsakSession, action: SessionAction): IsakSession {
  const next = reduce(session, action);
  return next === session ? session : { ...next, updatedAt: action.now };
}

function reduce(session: IsakSession, action: SessionAction): IsakSession {
  switch (action.type) {
    case 'record': {
      const site = currentSite(session);
      if (!site || !Number.isFinite(action.value)) return session;
      const prev = session.readings[site] ?? [];
      if (prev.length >= 3) return advance(session);
      const readings = { ...session.readings, [site]: [...prev, action.value] };
      const updated: IsakSession = {
        ...session,
        readings,
        skipped: session.skipped.filter((id) => id !== site),
        history: [...session.history, { site, kind: 'record' }],
      };
      // Modo «completar»: seguir en el mismo punto hasta resolverlo
      if (session.queueMode === 'complete' && !isResolved(updated, site)) return updated;
      return advance(updated);
    }
    case 'skip': {
      const site = currentSite(session);
      if (!site) return session;
      return advance({
        ...session,
        skipped: session.skipped.includes(site) ? session.skipped : [...session.skipped, site],
        history: [...session.history, { site, kind: 'skip' }],
      });
    }
    case 'back': {
      const last = session.history[session.history.length - 1];
      if (!last) return session;
      const history = session.history.slice(0, -1);
      const index = Math.max(0, session.queue.lastIndexOf(last.site, session.index));
      if (last.kind === 'skip') {
        return { ...session, history, index, skipped: session.skipped.filter((id) => id !== last.site) };
      }
      const r = session.readings[last.site] ?? [];
      return { ...session, history, index, readings: { ...session.readings, [last.site]: r.slice(0, -1) } };
    }
    case 'startPass': {
      if (session.phase !== 'break') return session;
      if (session.pass === 1) {
        const queue = secondPassQueue(session);
        if (queue.length) return { ...session, phase: 'measure', pass: 2, queue, index: 0, history: [] };
      }
      const third = sitesNeedingThird(session);
      if (third.length) return { ...session, phase: 'measure', pass: 3, queue: third, queueMode: 'single', index: 0, history: [] };
      return { ...session, phase: 'review', queue: [], index: 0, history: [] };
    }
    case 'finishEarly':
      return { ...session, phase: 'review', queue: [], index: 0, history: [] };
    case 'editReadings': {
      if (!session.sites.includes(action.siteId)) return session;
      const clean = action.readings.filter((v) => Number.isFinite(v) && v > 0).slice(0, 3);
      return {
        ...session,
        readings: { ...session.readings, [action.siteId]: clean },
        skipped: clean.length ? session.skipped.filter((id) => id !== action.siteId) : session.skipped,
      };
    }
    case 'requestThird': {
      const queue = ordered(action.siteIds).filter((id) => siteStatus(session, id) === 'needsThird');
      if (!queue.length) return session;
      return { ...session, phase: 'measure', pass: 3, queue, queueMode: 'single', index: 0, history: [] };
    }
    case 'retake': {
      // Medir ahora puntos pendientes o saltados: se completan uno a uno
      const queue = ordered(action.siteIds);
      if (!queue.length) return session;
      const readings = { ...session.readings };
      for (const id of queue) if ((readings[id]?.length ?? 0) === 0) readings[id] = [];
      return {
        ...session,
        readings,
        skipped: session.skipped.filter((id) => !queue.includes(id)),
        phase: 'measure',
        queue,
        queueMode: session.mode === 'transcribe' ? 'single' : 'complete',
        index: 0,
        history: [],
      };
    }
    case 'setMeasuredOn':
      return { ...session, measuredOn: action.measuredOn };
    case 'setFatEquation':
      return { ...session, fatEquation: action.fatEquation };
    case 'setVoice':
      return { ...session, voice: action.voice };
  }
}

/** Acción sin la hora (la añade quien despacha, en el manejador del evento). */
export type SessionActionInput = SessionAction extends infer A ? (A extends { now: number } ? Omit<A, 'now'> : never) : never;
