import { Image, ImageProps } from 'expo-image';

import { useMediaSource } from '@/lib/storage';

type Props = Omit<ImageProps, 'source' | 'cachePolicy'> & {
  /** Ruta del bucket privado, URL http(s) antigua o archivo local recién elegido. */
  mediaRef: string;
};

/**
 * Imagen confidencial de un cliente (avatar / foto de progreso) resuelta con URL firmada.
 * Solo se cachea en memoria: nunca queda copia en la caché de disco del dispositivo.
 */
export function StorageImage({ mediaRef, ...props }: Props) {
  const source = useMediaSource(mediaRef);
  return <Image {...props} source={source} cachePolicy="memory" recyclingKey={mediaRef} />;
}
