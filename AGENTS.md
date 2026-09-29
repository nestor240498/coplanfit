# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# CoplanFit — contexto del proyecto

App móvil para **entrenadores personales** (Fase 1 = solo vista entrenador): gestión de clientes, planes nutricionales y rutinas de entrenamiento asistidos por IA, antropometría con histórico/comparativas, y exportación a PDF con la marca del entrenador. UI y código en **español**.

Especificación funcional y visual: `design_handoff_coplanfit/` (README = handoff, `Concepto v2.md`, mockup HTML). Dirección visual **"Navy Pro"** — respetar tokens de `src/theme/`.

## Stack
- Expo SDK 57, React Native 0.86, React 19.2, TypeScript 6 (strict), React Compiler + typed routes activados (`app.json`).
- expo-router (rutas en `src/app/`), Zustand para estado, Supabase (auth + Postgres con RLS + Storage + Edge Functions).
- expo-print + expo-sharing para PDFs (HTML → PDF), expo-image-picker + expo-image-manipulator, expo-video (fondo animado), lucide-react-native.
- Se ejecuta también en web (`npm run web`, `.claude/launch.json` → puerto 8081); hay ramas `Platform.OS === 'web'` en varios sitios.
- Alias `@/*` → `src/*`. Sin tests. `npx tsc --noEmit` y `npx expo lint` deben quedar limpios.

## Estructura
- `src/app/_layout.tsx` — fuentes Manrope/Inter, `Stack.Protected` según sesión (`useAuth`).
- `src/app/(tabs)/` — Clientes (`index`), Ejercicios (banco), Suscripción, Perfil.
- `src/app/client/new.tsx`, `src/app/client/[id]/index.tsx` — ficha con tabs Datos / Salud / Antropometría / Planes / Entrenamiento.
  - `measurements/` update · history · compare (máx. 2 seleccionadas).
  - `plans/` wizard de 3 pasos: `new` (comidas, agua, suplementos, nota IA) → `assistant` (sugerencias IA por grupo de alimento) → `assign` (asignar a comidas, opción 1/2) → `preview` (PDF) · `compare`.
  - `workouts/` wizard: `new` → `assistant` (IA, bloques simples/superseries) → `assign` → `preview`.
- `src/features/<dominio>/` — `repository.ts` / `*Repository.ts` (acceso Supabase), `types.ts`, stores Zustand (`planBuilderStore`, `workoutBuilderStore`), `components/` (tabs de la ficha, bottom sheets).
- `src/components/ui/` — kit propio (Button, Card, BottomSheet, WheelPicker, TabBar, FAB, ScreenHeader…).
- `src/theme/` — `tokens.ts` (colores, radios, sombras), `typography.ts`, `scale.ts` (`s()` convierte px del mockup de 280px de ancho a dp).
- `src/lib/` — `supabase.ts` (cliente; `isSupabaseConfigured`), `format.ts`, `measurementTrends.ts` (flechas favorables según objetivo).

## Datos (Supabase)
- SQL en `supabase/`: `schema.sql` → `migration_002..011` → `seed_exercises.sql`. Se aplican con `supabase db query --linked -f <archivo>` (o en el SQL Editor); no hay `supabase/migrations/` ni historial de migraciones de la CLI. Nuevas migraciones: `migration_00N_<nombre>.sql`, idempotentes (`if not exists`, `drop policy if exists`).
- Tablas: `profiles` (role `trainer`/`super_admin`, trigger al registrarse), `clients`, `client_tags` (alergia/condicion/evita), `measurements` (append-only; `bmi` y `waist_hip_ratio` son columnas generadas), `plan_versions` y `workout_plan_versions` (jsonb `data`, una `is_current` por cliente vía índice único parcial), `exercises` (globales `is_custom=false` visibles para todos + personalizados `created_by`, visibles solo para su autor); un ejercicio se **archiva** (`archived_at`) en vez de borrarse si es oficial o si alguna rutina lo usa (`removeExercise()`, RPC `exercise_in_use`). Vista `clients_with_current_plan`.
- RLS: todo se filtra por `clients.trainer_id = auth.uid()`; los repositorios no pasan `trainer_id` salvo al insertar.
- **Borradores** de plan/rutina se guardan en la misma tabla de versiones con `data.is_draft = true` y `is_current = false`; los listados los filtran.
- Storage (rutas siempre `<uid>/...`, lo exige la policy):
  - `logos` (público): logo del entrenador e imágenes de ejercicios.
  - `exercise-media` (privado, migración 009): vídeo demostrativo del ejercicio (`exercises.video_path`, ruta `<uid>/videos/...`). Lo lee el autor, o cualquier usuario con sesión si el ejercicio es oficial. Mostrar con `<ExerciseVideo>`.
  - `client-media` (**privado y CONFIDENCIAL**, migración 006): avatares y fotos de progreso de clientes. Ruta `<client_id>/<avatar|measurements>/<id>.jpg`. El acceso lo decide `can_access_client_media()`: solo el entrenador del cliente (en Fase 2 también el usuario sin entrenador y el cliente vinculado, este último solo lectura).
    - Subir siempre con `uploadClientMedia()` de `src/lib/storage.ts`, que vuelve a codificar la foto sin EXIF/GPS y la limita a 1600 px.
    - En BD se guarda la **ruta**, nunca una URL. Para mostrarla: `<StorageImage mediaRef>` (URL firmada de 5 min, caché solo en memoria); para los PDF: `resolveMediaUrls()`. La caché se borra al cerrar sesión.
    - Nunca usar `getPublicUrl`, caché de disco ni el bucket `logos` para fotos de clientes.
- El esquema real se puede consultar con `supabase db query --linked "<sql>"` (la CLI está vinculada; `db dump/pull` requieren Docker).
- Varios repositorios tienen fallbacks silenciosos si falta una columna/tabla (p. ej. `profiles.description`, `workout_plan_versions`) y `getExercises()` cae a `DEFAULT_EXERCISES` en memoria (ids `default-N`).

## Banco de ejercicios
- Modelo (migración 008): `exercise_type`, `metric` (cómo se mide), `laterality` (bilateral/unilateral/alternado), `movement_pattern`, `extra_equipment`, `cues`, `contraindications`, `aliases`, `parent_id` (variante de). Listas y etiquetas en `types.ts` (`EXERCISE_TYPES`, `EXERCISE_METRICS`, `LATERALITIES`, `MOVEMENT_PATTERNS`); deben coincidir con los enums de la Edge Function `classify-exercise`.
- Alta rápida: `classifyExercise()` propone la clasificación desde el nombre. Sustitutos: `findSubstitutes()` (mismo patrón). Al añadir a una rutina usar `executionFromExercise()` (`prescription.ts`), que hereda métrica y lateralidad.
- Grupos musculares y equipos: `MUSCLE_GROUPS` / `EXERCISE_EQUIPMENT` en `src/features/workouts/types.ts`. En la UI mostrar siempre `muscleLabel()` / `equipmentLabel()`, nunca el id crudo.
- Búsqueda y aviso de duplicados: `matchesExerciseQuery()` / `findSimilarExercises()` en `exerciseSearch.ts` (ignoran tildes).
- Al añadir un ejercicio a una rutina se enlaza por `exercise_id` (salvo los de respaldo `default-N`), y `notes` empieza vacío: son notas para ese cliente, no la técnica general.

## PDF y envío al cliente
- Base común en `src/lib/pdf.ts`: `esc()` (obligatorio para todo texto del usuario), `pdfHeader` / `pdfMetaCard` / `pdfSectionTitle` / `pdfFooter` / `pdfDocument` (estilo Navy Pro) y salida `sharePdf` / `downloadPdf`.
- Cada documento expone un `build…Html()` (plan, rutina, medición, comparativa, informe completo en `clientReportPdf.ts`) y la UI abre siempre `<SendDocumentSheet>` con un `DocumentToDeliver`.
- «Enviar» abre el menú de compartir y anota el envío en `sent_log` (`sendDocument`); «Descargar» abre el diálogo de imprimir/guardar sin anotarlo. En la Fase 2, `sendDocument` también publicará en la app del cliente.
- El informe completo no incluye las notas privadas del entrenador (`notes`, `medical_notes`); las fotos solo con el interruptor.
- `clients.phone`: dígitos con prefijo de país sin el 0 nacional (`src/lib/phone.ts`); habilita abrir el chat de WhatsApp (`wa.me`).

## Rutinas de entrenamiento
- Una rutina **solo contiene ejercicios del banco**, enlazados por `exercise_id`; nunca nombres inventados.
- `routineGenerator.ts`: equipo del cliente (`isEquipmentAvailable`), contraindicaciones frente a sus condiciones (`conflictingContraindications`), propuesta local desde el banco (`buildRoutineFromBank`) y sugerencias para «Cambiar» (`suggestReplacements`, 2 equivalentes).
- `routineAi.ts` envía a `generate-workout-suggestions` el catálogo ya filtrado; la función comprueba los ids con RLS y el esquema de Gemini restringe `exercise_id` a esos ids. Si la IA falla, se usa `buildRoutineFromBank`.
- Cada día tiene `muscles` (paso 1) y la rutina `generation` (ejercicios por día, superseries), que decide el entrenador.
- Mostrar la prescripción con `formatPrescription()` («30 s», «10-12 reps por lado»). PDF bajo demanda: `shareWorkoutPdf()` (`workoutPdf.ts`), que escapa todo texto del usuario con `esc()`.

## Edge Functions (`supabase/functions/`, Deno, Google Gemini)
- `generate-plan-suggestions`, `generate-workout-suggestions`, `generate-exercise-details` (técnica y consejos; ya no genera imágenes) y `classify-exercise` (alta rápida). Ninguna puede usarse sin sesión: `classify-exercise` y `generate-exercise-details` llaman a `auth.getUser()`; las de planes fallan antes de llamar a Gemini si RLS no deja leer al cliente.
- Se despliegan con `--no-verify-jwt` (por el preflight CORS en web); la función valida el JWT del entrenador y usa la anon key para que RLS aplique. Secret: `GEMINI_API_KEY`.
- Cliente: `supabase.functions.invoke(...)`; cada llamada tiene fallback algorítmico local si la IA falla.

## Estado / pendientes conocidos (sep 2026)
- `migration_006` recoge las columnas que se habían creado a mano en el dashboard. `measurements.bone_mass_kg`, `water_pct` y `midaxillary_mm` siguen en la BD aunque la app ya no las usa.
- Suscripción: planes (Básico 10 / Medium 20 / Pro 50 clientes) hardcodeados en `subscription.tsx`, plan activo solo en estado local; `PLAN_LIMIT = 10` fijo en la lista de clientes. Sin tabla de suscripciones ni pagos. Panel Super Admin (validar pagos móviles) aún no implementado.
- Lógica de subida de fotos de medición duplicada entre `client/[id]/index.tsx` y `measurements/update.tsx`; `workouts/assign.tsx` y la ficha acceden a Supabase directamente en lugar de vía repositorio.
- `bundleIdentifier` sigue siendo `com.anonymous.coplanfit`; README es el de la plantilla de Expo.
