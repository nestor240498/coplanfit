import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** false hasta que .env tenga las credenciales reales del proyecto Supabase */
export const isSupabaseConfigured = Boolean(url && anonKey && !url.includes('TU-PROYECTO'));

export const supabase = createClient(url ?? 'https://TU-PROYECTO.supabase.co', anonKey ?? 'anon-key-pendiente', {
  auth: {
    // En web (incluido el render estático de Expo) supabase usa su storage por defecto;
    // AsyncStorage solo en iOS/Android.
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
