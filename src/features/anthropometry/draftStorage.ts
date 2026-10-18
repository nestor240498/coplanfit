import AsyncStorage from '@react-native-async-storage/async-storage';

import { type IsakSession, measuredCount } from './engine';

/**
 * Borrador de la evaluación ISAK en curso, en el dispositivo (AsyncStorage; localStorage en web).
 * Solo guarda las lecturas y la configuración: ni nombres ni fotos. Caduca a los 7 días y se borra
 * al cerrar sesión.
 */
const PREFIX = 'coplanfit:isak-draft:v1:';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function key(trainerId: string, clientId: string): string {
  return `${PREFIX}${trainerId}:${clientId}`;
}

export async function loadDraft(trainerId: string, clientId: string, now: number): Promise<IsakSession | null> {
  const raw = await AsyncStorage.getItem(key(trainerId, clientId));
  if (!raw) return null;
  try {
    const draft = JSON.parse(raw) as IsakSession;
    const valid =
      draft?.v === 1 && draft.trainerId === trainerId && draft.clientId === clientId && now - draft.updatedAt < MAX_AGE_MS;
    if (!valid) {
      await AsyncStorage.removeItem(key(trainerId, clientId));
      return null;
    }
    return draft;
  } catch {
    await AsyncStorage.removeItem(key(trainerId, clientId));
    return null;
  }
}

export async function saveDraft(session: IsakSession): Promise<void> {
  await AsyncStorage.setItem(key(session.trainerId, session.clientId), JSON.stringify(session));
}

export async function deleteDraft(trainerId: string, clientId: string): Promise<void> {
  await AsyncStorage.removeItem(key(trainerId, clientId));
}

export type DraftSummary = { measured: number; total: number; updatedAt: number; profile: 'isak' | 'skinfolds' };

export async function loadDraftSummary(trainerId: string, clientId: string, now: number): Promise<DraftSummary | null> {
  const draft = await loadDraft(trainerId, clientId, now);
  if (!draft) return null;
  return { measured: measuredCount(draft), total: draft.sites.length, updatedAt: draft.updatedAt, profile: draft.profile ?? 'isak' };
}

/** Borra todos los borradores (al cerrar sesión). */
export async function clearAllIsakDrafts(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const drafts = keys.filter((k) => k.startsWith(PREFIX));
  if (drafts.length) await AsyncStorage.multiRemove(drafts);
}
