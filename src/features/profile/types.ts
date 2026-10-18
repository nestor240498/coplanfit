export type Profile = {
  id: string;
  full_name: string;
  email: string;
  business_name: string | null;
  description?: string | null;
  logo_url: string | null;
  /** Certificación del evaluador (p. ej. «ISAK nivel 1»), en el pie de los informes. */
  certification?: string | null;
};

