import { useState } from 'react';

/**
 * Devuelve `value` o, si pasa a null, el último valor no nulo. Sirve para que una hoja que se cierra
 * al poner su dato a null (`setX(null)`) siga pintando su contenido mientras dura la animación de salida,
 * en lugar de desaparecer de golpe.
 */
export function useRetained<T>(value: T | null | undefined): T | null {
  const [last, setLast] = useState<T | null>(value ?? null);
  // Ajuste de estado durante el render (patrón recomendado por React en lugar de un efecto)
  if (value != null && value !== last) setLast(value);
  return value ?? last;
}
