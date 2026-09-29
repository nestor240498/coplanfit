-- CoplanFit — migración 010: quitar las imágenes generadas con IA (pollinations.ai) de los ejercicios
-- Eran ilustraciones con anatomía poco fiable. Las fotos o el vídeo de cada ejercicio los aporta el entrenador.
-- Idempotente.

update public.exercises
set images = coalesce(
    (
      select jsonb_agg(img)
      from jsonb_array_elements_text(images) as img
      where img not like '%pollinations.ai%'
    ),
    '[]'::jsonb
  )
where images::text like '%pollinations.ai%';

update public.exercises
set image_url = null
where image_url like '%pollinations.ai%';

update public.exercises
set steps = (
    select jsonb_agg(step - 'image_url')
    from jsonb_array_elements(steps) as step
  )
where steps::text like '%pollinations.ai%';
