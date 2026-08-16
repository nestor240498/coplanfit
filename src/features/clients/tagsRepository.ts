import { supabase } from '@/lib/supabase';

import { ClientTag, TagKind } from './types';

export async function listTags(clientId: string): Promise<ClientTag[]> {
  const { data, error } = await supabase
    .from('client_tags')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as ClientTag[];
}

export async function addTag(clientId: string, kind: TagKind, label: string): Promise<ClientTag> {
  const { data, error } = await supabase
    .from('client_tags')
    .insert({ client_id: clientId, kind, label: label.trim() })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as ClientTag;
}

export async function removeTag(tagId: string): Promise<void> {
  const { error } = await supabase.from('client_tags').delete().eq('id', tagId);
  if (error) throw new Error(error.message);
}
