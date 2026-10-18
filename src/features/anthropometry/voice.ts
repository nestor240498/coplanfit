import * as Speech from 'expo-speech';

/**
 * Voz durante la toma: anuncia el punto y el número de lectura para que el entrenador no tenga que
 * mirar la pantalla con el plicómetro en la mano. Siempre corta lo anterior antes de hablar.
 */
const ORDINALS = ['', 'primera', 'segunda', 'tercera'];

export function speak(text: string): void {
  try {
    Speech.stop();
    Speech.speak(text, { language: 'es-ES', rate: 1.0 });
  } catch {
    // Sin motor de voz disponible: la toma sigue igual
  }
}

export function stopSpeaking(): void {
  try {
    Speech.stop();
  } catch {
    // nada que parar
  }
}

export function announceSite(siteName: string, readingNumber: number): void {
  const ordinal = ORDINALS[readingNumber];
  speak(ordinal ? `${siteName}. ${ordinal[0].toUpperCase()}${ordinal.slice(1)} medida.` : siteName);
}

export function announceMismatch(): void {
  speak('Diferencia alta. Se repetirá al final.');
}
