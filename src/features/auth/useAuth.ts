import { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

import { supabase } from '@/lib/supabase';

type AuthState = {
  session: Session | null;
  /** true mientras se restaura la sesión persistida al arrancar */
  initializing: boolean;
  init: () => void;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (fullName: string, email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

let initialized = false;

export const useAuth = create<AuthState>((set) => ({
  session: null,
  initializing: true,

  init: () => {
    if (initialized) return;
    initialized = true;
    supabase.auth.getSession().then(({ data }) => {
      set({ session: data.session, initializing: false });
    });
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, initializing: false });
    });
  },

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return { error: error ? translateAuthError(error.message) : null };
  },

  signUp: async (fullName, email, password) => {
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName.trim() } },
    });
    return { error: error ? translateAuthError(error.message) : null };
  },

  signOut: async () => {
    await supabase.auth.signOut();
  },
}));

function translateAuthError(message: string): string {
  if (message.includes('Invalid login credentials')) return 'Correo o contraseña incorrectos.';
  if (message.includes('Email not confirmed')) return 'Confirma tu correo antes de iniciar sesión.';
  if (message.includes('already registered')) return 'Ya existe una cuenta con ese correo.';
  if (message.toLowerCase().includes('password')) return 'La contraseña debe tener al menos 6 caracteres.';
  if (message.includes('Network request failed'))
    return 'Sin conexión con el servidor. Revisa tu internet o la configuración de Supabase.';
  return message;
}
